<?php
declare(strict_types=1);

// ดัก output เศษ ๆ
ob_start();

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// log ลงไฟล์ข้าง ๆ (ชั่วคราว)
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php_errors.log');

// warning/notice -> Exception
set_error_handler(function($severity,$message,$file,$line){
  throw new ErrorException($message, 0, $severity, $file, $line);
});

// Exception ทุกชนิด -> JSON
set_exception_handler(function(Throwable $e){
  if (ob_get_level()) ob_end_clean();
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Unhandled exception','details'=>$e->getMessage()], JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
  exit;
});

// fatal ตอนจบ -> JSON (กัน IIS ยึดหน้า)
register_shutdown_function(function(){
  $e = error_get_last();
  if ($e && in_array($e['type'], [E_ERROR,E_PARSE,E_CORE_ERROR,E_COMPILE_ERROR])) {
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    echo json_encode([
      'success'=>false,
      'error'=>'Fatal error',
      'details'=>$e['message'].' @'.$e['file'].':'.$e['line']
    ], JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
  } else {
    if (ob_get_level()) ob_end_flush();
  }
});


ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ตรวจสอบ PHP Extensions ที่จำเป็น
$requiredExtensions = ['sqlsrv']; // ใช้แค่ sqlsrv เหมือนไฟล์อื่นๆ
$missingExtensions = [];

foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        $missingExtensions[] = $ext;
    }
}

if (!empty($missingExtensions)) {
    http_response_code(500);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode([
        'success' => false,
        'error' => 'Required PHP extensions missing',
        'details' => 'Missing extensions: ' . implode(', ', $missingExtensions),
        'solution' => 'Please enable sqlsrv extension in php.ini',
        'php_version' => phpversion(),
        'loaded_extensions' => get_loaded_extensions()
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Database configuration
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/utils.php';

// Check connection
if (!$conn) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Get action parameter
$action = $_GET['action'] ?? '';

// ===== PRODUCTION PLANS APIs =====

// ดึงแผนงานทั้งหมด
if ($action === 'get_plans') {
    $sql = "SELECT p.*, 
                   d.DepartmentName,
                   -- Computed columns
                   p.PlannedTotalMinutes,
                   p.BreakTotalMinutes, 
                   p.PlannedNetMinutes,
                   
                   -- Primary machine info
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
        // แปลง DateTime objects
        $row['PlannedStartTime'] = formatDateTime($row['PlannedStartTime']);
        $row['PlannedEndTime'] = formatDateTime($row['PlannedEndTime']);
        $row['CreatedAt'] = formatDateTime($row['CreatedAt']);
        $row['UpdatedAt'] = formatDateTime($row['UpdatedAt']);
        
        // เพิ่มข้อมูล backward compatibility
        $row['MachineName'] = $row['PrimaryMachineName'] ?: 'ไม่ระบุ';
        $row['ProductDisplayName'] = trim(($row['ProductName'] ?? '') . ' ' . ($row['ProductSize'] ?? ''));
        
        // คำนวณ duration hours
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

// ดึงแผนงานเดี่ยว
if ($action === 'get_plan' && isset($_GET['PlanID'])) {
    $planId = intval($_GET['PlanID']);
    $sql = "SELECT p.*, 
                   ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName 
            FROM ProductionPlans p
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
        $row['PlannedStartTime'] = formatDateTime($row['PlannedStartTime']);
        $row['PlannedEndTime'] = formatDateTime($row['PlannedEndTime']);
        $row['CreatedAt'] = formatDateTime($row['CreatedAt']);
        $row['UpdatedAt'] = formatDateTime($row['UpdatedAt']);
    }
    
    echo $row ? json_encode($row, JSON_UNESCAPED_UNICODE) : json_encode(['success' => false, 'error' => 'ไม่พบข้อมูลแผนงาน'], JSON_UNESCAPED_UNICODE);
    exit;
}

// เพิ่มแผนงานใหม่ - ขั้นตอน 1: บันทึกหัวแผนเพื่อรับ PlanID
if ($action === 'create_plan_header') {
    try {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON data'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        sqlsrv_begin_transaction($conn);
        
        $status = $data['Status'] ?? 'planning';
        if (!validateStatus($status)) {
            throw new Exception('Invalid plan status: ' . $status);
        }
        
        // บันทึกหัวแผนใน ProductionPlans เพื่อรับ PlanID
        // ถ้ามีการส่ง SubDepartmentIDs มา จะเอา SubDepartmentID แรกเป็น primary
        $primarySubDepartmentId = null;
        if (isset($data['SubDepartmentIDs']) && !empty($data['SubDepartmentIDs'])) {
            $subDeptIds = explode(',', $data['SubDepartmentIDs']);
            $primarySubDepartmentId = intval(trim($subDeptIds[0]));
        }
        
        $planSql = "INSERT INTO ProductionPlans (
            LotNumber, ProductName, ProductSize, DepartmentID, DepartmentName, SubDepartmentID,
            LotSize, TargetOutput, WorkerCount, Status,
            PlannedStartTime, PlannedEndTime, Details,
            BreakMorningMinutes, BreakLunchMinutes, BreakEveningMinutes,
            SetupMinutes, SetupNote,
            CreatedByUserID, UpdatedByUserID
        ) OUTPUT INSERTED.PlanID, INSERTED.DepartmentID VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        // ดึงชื่อแผนกก่อนบันทึก
        $departmentId = (int)($data['DepartmentID'] ?? 0);
        $departmentName = $data['DepartmentName'] ?? null;
        
        // ถ้าไม่มี DepartmentName มาในข้อมูล ให้ดึงจากฐานข้อมูล
        if (!$departmentName && $departmentId > 0) {
            $deptNameSql = "SELECT DepartmentName FROM Departments WHERE DepartmentID = ?";
            $deptNameStmt = sqlsrv_query($conn, $deptNameSql, [$departmentId]);
            if ($deptNameStmt) {
                $deptRow = sqlsrv_fetch_array($deptNameStmt, SQLSRV_FETCH_ASSOC);
                if ($deptRow) {
                    $departmentName = $deptRow['DepartmentName'];
                }
            }
        }
        
        $planStmt = sqlsrv_query($conn, $planSql, [
            $data['LotNumber'] ?? '',
            $data['ProductName'] ?? '',
            $data['ProductSize'] ?? '',
            $departmentId,
            $departmentName,
            $primarySubDepartmentId,
            (int)($data['LotSize'] ?? 0),
            (int)($data['TargetOutput'] ?? 0),
            (int)($data['WorkerCount'] ?? 0),
            $status,
            $data['PlannedStartTime'] ?? null,
            $data['PlannedEndTime'] ?? null,
            $data['Details'] ?? '',
            (int)($data['BreakMorningMinutes'] ?? 0),
            (int)($data['BreakLunchMinutes'] ?? 0), 
            (int)($data['BreakEveningMinutes'] ?? 0),
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
        $departmentId = $planRow['DepartmentID'];
        
        sqlsrv_commit($conn);
        echo json_encode([
            'success' => true, 
            'PlanID' => $planId,
            'DepartmentID' => $departmentId,
            'DepartmentName' => $departmentName,
            'message' => 'Plan header created successfully'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        sqlsrv_rollback($conn);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// เพิ่มแผนงานใหม่ - ขั้นตอน 2: กำหนด Machines และ Sub-Departments
if ($action === 'assign_plan_resources') {
    try {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON data'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $planId = (int)($data['PlanID'] ?? 0);
        $departmentId = (int)($data['DepartmentID'] ?? 0);
        
        if ($planId <= 0 || $departmentId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'PlanID and DepartmentID are required'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        sqlsrv_begin_transaction($conn);
        
        // ตรวจสอบว่า Plan ID มีอยู่จริง
        $checkSql = "SELECT PlanID, DepartmentID FROM ProductionPlans WHERE PlanID = ?";
        $checkStmt = sqlsrv_query($conn, $checkSql, [$planId]);
        
        if ($checkStmt === false || !sqlsrv_has_rows($checkStmt)) {
            throw new Exception('Plan ID not found: ' . $planId);
        }
        
        // 1. Insert Machine Assignments - Bulk Insert
        if (isset($data['MachineIDs']) && $data['MachineIDs']) {
            // ลบ assignments เก่าก่อน (ถ้ามี)
            $deleteMachineSql = "DELETE FROM ProductionPlanMachines WHERE PlanID = ?";
            sqlsrv_query($conn, $deleteMachineSql, [$planId]);
            
            $machineIds = array_filter(array_map(function($id) {
                $id = intval(trim($id));
                return $id > 0 ? $id : null;
            }, explode(',', $data['MachineIDs'])));
            
            if (!empty($machineIds)) {
                // สร้าง bulk insert statement
                $machineValues = [];
                $machineParams = [];
                
                foreach ($machineIds as $machineId) {
                    $machineValues[] = "(?, ?, ?, ?)";
                    $machineParams[] = $planId;
                    $machineParams[] = $departmentId;
                    $machineParams[] = $machineId;
                    $machineParams[] = 'System';
                }
                
                $assignSql = "INSERT INTO ProductionPlanMachines (PlanID, DepartmentID, MachineID, CreatedBy) VALUES " 
                            . implode(', ', $machineValues);
                
                $assignStmt = sqlsrv_query($conn, $assignSql, $machineParams);
                
                if ($assignStmt === false) {
                    throw new Exception('Failed to bulk insert machine assignments: ' . print_r(sqlsrv_errors(), true));
                }
            }
        }
        
        // 2. Insert Sub-Department Assignments - Bulk Insert
        if (isset($data['SubDepartmentIDs']) && $data['SubDepartmentIDs']) {
            // ลบ assignments เก่าก่อน (ถ้ามี)
            $deleteSubDeptSql = "DELETE FROM ProductionPlanSubDepartments WHERE PlanID = ?";
            sqlsrv_query($conn, $deleteSubDeptSql, [$planId]);
            
            $subDeptIds = array_filter(array_map(function($id) {
                $id = intval(trim($id));
                return $id > 0 ? $id : null;
            }, explode(',', $data['SubDepartmentIDs'])));
            
            if (!empty($subDeptIds)) {
                // สร้าง bulk insert statement
                $subDeptValues = [];
                $subDeptParams = [];
                
                foreach ($subDeptIds as $subDeptId) {
                    $subDeptValues[] = "(?, ?, ?, ?)";
                    $subDeptParams[] = $planId;
                    $subDeptParams[] = $departmentId;
                    $subDeptParams[] = $subDeptId;
                    $subDeptParams[] = 'System';
                }
                
                $subAssignSql = "INSERT INTO ProductionPlanSubDepartments (PlanID, DepartmentID, SubDepartmentID, CreatedBy) VALUES " 
                               . implode(', ', $subDeptValues);
                
                $subAssignStmt = sqlsrv_query($conn, $subAssignSql, $subDeptParams);
                
                if ($subAssignStmt === false) {
                    throw new Exception('Failed to bulk insert sub-department assignments: ' . print_r(sqlsrv_errors(), true));
                }
            }
        }
        
        sqlsrv_commit($conn);
        echo json_encode([
            'success' => true, 
            'PlanID' => $planId,
            'message' => 'Resources assigned successfully'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        sqlsrv_rollback($conn);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// เพิ่มแผนงานใหม่ - แบบเดิม (เพื่อ backward compatibility)
if ($action === 'add_plan') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON data'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    try {
        sqlsrv_begin_transaction($conn);
        
        $status = $data['Status'] ?? 'planning';
        if (!validateStatus($status)) {
            throw new Exception('Invalid plan status: ' . $status);
        }
        
        // 1. Insert ProductionPlan
        // ถ้ามีการส่ง SubDepartmentIDs มา จะเอา SubDepartmentID แรกเป็น primary
        $primarySubDepartmentId = null;
        if (isset($data['SubDepartmentIDs']) && !empty($data['SubDepartmentIDs'])) {
            $subDeptIds = explode(',', $data['SubDepartmentIDs']);
            $primarySubDepartmentId = intval(trim($subDeptIds[0]));
        }
        
        $planSql = "INSERT INTO ProductionPlans (
            LotNumber, ProductName, ProductSize, DepartmentID, DepartmentName, SubDepartmentID,
            LotSize, TargetOutput, WorkerCount, Status,
            PlannedStartTime, PlannedEndTime, Details,
            BreakMorningMinutes, BreakLunchMinutes, BreakEveningMinutes,
            SetupMinutes, SetupNote,
            CreatedByUserID, UpdatedByUserID
        ) OUTPUT INSERTED.PlanID VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        // ดึงชื่อแผนกก่อนบันทึก
        $departmentId = (int)($data['DepartmentID'] ?? 0);
        $departmentName = $data['DepartmentName'] ?? null;
        
        // ถ้าไม่มี DepartmentName มาในข้อมูล ให้ดึงจากฐานข้อมูล
        if (!$departmentName && $departmentId > 0) {
            $deptNameSql = "SELECT DepartmentName FROM Departments WHERE DepartmentID = ?";
            $deptNameStmt = sqlsrv_query($conn, $deptNameSql, [$departmentId]);
            if ($deptNameStmt) {
                $deptRow = sqlsrv_fetch_array($deptNameStmt, SQLSRV_FETCH_ASSOC);
                if ($deptRow) {
                    $departmentName = $deptRow['DepartmentName'];
                }
            }
        }
        
        $planStmt = sqlsrv_query($conn, $planSql, [
            $data['LotNumber'] ?? '',
            $data['ProductName'] ?? '',
            $data['ProductSize'] ?? '',
            $departmentId,
            $departmentName,
            $primarySubDepartmentId,
            (int)($data['LotSize'] ?? 0),
            (int)($data['TargetOutput'] ?? 0),
            (int)($data['WorkerCount'] ?? 0),
            $status,
            $data['PlannedStartTime'] ?? null,
            $data['PlannedEndTime'] ?? null,
            $data['Details'] ?? '',
            (int)($data['BreakMorningMinutes'] ?? 0),
            (int)($data['BreakLunchMinutes'] ?? 0), 
            (int)($data['BreakEveningMinutes'] ?? 0),
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
        
        // 2. Insert Machine Assignments - Bulk Insert
        if (isset($data['MachineIDs']) && $data['MachineIDs']) {
            $machineIds = array_filter(array_map(function($id) {
                $id = intval(trim($id));
                return $id > 0 ? $id : null;
            }, explode(',', $data['MachineIDs'])));
            
            if (!empty($machineIds)) {
                // สร้าง bulk insert statement
                $machineValues = [];
                $machineParams = [];
                
                foreach ($machineIds as $machineId) {
                    $machineValues[] = "(?, ?, ?, ?)";
                    $machineParams[] = $planId;
                    $machineParams[] = $data['DepartmentID'];
                    $machineParams[] = $machineId;
                    $machineParams[] = 'System';
                }
                
                $assignSql = "INSERT INTO ProductionPlanMachines (PlanID, DepartmentID, MachineID, CreatedBy) VALUES " 
                            . implode(', ', $machineValues);
                
                $assignStmt = sqlsrv_query($conn, $assignSql, $machineParams);
                
                if ($assignStmt === false) {
                    throw new Exception('Failed to bulk insert machine assignments: ' . print_r(sqlsrv_errors(), true));
                }
            }
        }
        
        // 3. Insert Sub-Department Assignments - Bulk Insert
        if (isset($data['SubDepartmentIDs']) && $data['SubDepartmentIDs']) {
            $subDeptIds = array_filter(array_map(function($id) {
                $id = intval(trim($id));
                return $id > 0 ? $id : null;
            }, explode(',', $data['SubDepartmentIDs'])));
            
            if (!empty($subDeptIds)) {
                // สร้าง bulk insert statement
                $subDeptValues = [];
                $subDeptParams = [];
                
                foreach ($subDeptIds as $subDeptId) {
                    $subDeptValues[] = "(?, ?, ?, ?)";
                    $subDeptParams[] = $planId;
                    $subDeptParams[] = $data['DepartmentID'];
                    $subDeptParams[] = $subDeptId;
                    $subDeptParams[] = 'System';
                }
                
                $subAssignSql = "INSERT INTO ProductionPlanSubDepartments (PlanID, DepartmentID, SubDepartmentID, CreatedBy) VALUES " 
                               . implode(', ', $subDeptValues);
                
                $subAssignStmt = sqlsrv_query($conn, $subAssignSql, $subDeptParams);
                
                if ($subAssignStmt === false) {
                    throw new Exception('Failed to bulk insert sub-department assignments: ' . print_r(sqlsrv_errors(), true));
                }
            }
        }
        
        sqlsrv_commit($conn);
        echo json_encode([
            'success' => true, 
            'PlanID' => $planId,
            'DepartmentName' => $departmentName
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        sqlsrv_rollback($conn);
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// อัปเดตแผนงาน
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
        
        if (array_key_exists('Status', $data) && !validateStatus($data['Status'])) {
            throw new Exception('Invalid plan status: ' . $data['Status']);
        }
        
        // 1. Update ProductionPlan
        $updateFields = [];
        $updateParams = [];
        
        $updatableFields = [
            'LotNumber', 'ProductName', 'ProductSize', 'DepartmentID', 'DepartmentName', 'SubDepartmentID',
            'LotSize', 'TargetOutput', 'WorkerCount', 'Status', 'OrderNumber',
            'PlannedStartTime', 'PlannedEndTime', 'Details',
            'BreakMorningMinutes', 'BreakLunchMinutes', 'BreakEveningMinutes',
            'SetupMinutes', 'SetupNote', 'UpdatedByUserID'
        ];
        
        foreach ($updatableFields as $field) {
            if (array_key_exists($field, $data)) {
                $value = $data[$field];
                
                // จัดการ DepartmentName - ถ้ามี DepartmentID ใหม่แต่ไม่มี DepartmentName ให้ดึงมา
                if ($field === 'DepartmentID' && !array_key_exists('DepartmentName', $data)) {
                    $departmentId = intval($value);
                    if ($departmentId > 0) {
                        $deptNameSql = "SELECT DepartmentName FROM Departments WHERE DepartmentID = ?";
                        $deptNameStmt = sqlsrv_query($conn, $deptNameSql, [$departmentId]);
                        if ($deptNameStmt) {
                            $deptRow = sqlsrv_fetch_array($deptNameStmt, SQLSRV_FETCH_ASSOC);
                            if ($deptRow) {
                                $updateFields[] = "DepartmentName = ?";
                                $updateParams[] = $deptRow['DepartmentName'];
                            }
                        }
                    }
                }
                
                if (in_array($field, ['LotSize', 'TargetOutput', 'WorkerCount', 'DepartmentID', 'SubDepartmentID',
                                     'BreakMorningMinutes', 'BreakLunchMinutes', 'BreakEveningMinutes', 
                                     'SetupMinutes', 'UpdatedByUserID'])) {
                    $value = $value !== '' ? intval($value) : ($field === 'SubDepartmentID' ? null : 0);
                }
                
                if (in_array($field, ['PlannedStartTime', 'PlannedEndTime']) && !empty($value)) {
                    if (is_string($value)) {
                        try {
                            $dateObj = new DateTime($value);
                            $value = $dateObj->format('Y-m-d H:i:s');
                        } catch (Exception $e) {
                            continue;
                        }
                    }
                }
                
                $updateFields[] = "$field = ?";
                $updateParams[] = $value;
            }
        }
        
        if (!empty($updateFields)) {
            $updateFields[] = "UpdatedAt = GETDATE()";
            
            $updateSql = "UPDATE ProductionPlans SET " . implode(', ', $updateFields) . " WHERE PlanID = ?";
            $updateParams[] = $planId;
            
            $updateStmt = sqlsrv_query($conn, $updateSql, $updateParams);
            if ($updateStmt === false) {
                throw new Exception('Failed to update ProductionPlan: ' . print_r(sqlsrv_errors(), true));
            }
        }
        
        // 2. Update Machine Assignments
        if (array_key_exists('MachineIDs', $data)) {
            $deleteMachineSql = "DELETE FROM ProductionPlanMachines WHERE PlanID = ?";
            $deleteMachineStmt = sqlsrv_query($conn, $deleteMachineSql, [$planId]);
            
            if ($deleteMachineStmt === false) {
                throw new Exception('Failed to delete old machine assignments: ' . print_r(sqlsrv_errors(), true));
            }
            
            if (!empty($data['MachineIDs'])) {
                $machineIds = array_filter(array_map(function($id) {
                    $id = intval(trim($id));
                    return $id > 0 ? $id : null;
                }, explode(',', $data['MachineIDs'])));
                
                if (!empty($machineIds)) {
                    // สร้าง bulk insert statement
                    $machineValues = [];
                    $machineParams = [];
                    
                    foreach ($machineIds as $machineId) {
                        $machineValues[] = "(?, ?, ?, ?)";
                        $machineParams[] = $planId;
                        $machineParams[] = $data['DepartmentID'] ?? 0;
                        $machineParams[] = $machineId;
                        $machineParams[] = 'System';
                    }
                    
                    $assignSql = "INSERT INTO ProductionPlanMachines (PlanID, DepartmentID, MachineID, CreatedBy) VALUES " 
                                . implode(', ', $machineValues);
                    
                    $assignStmt = sqlsrv_query($conn, $assignSql, $machineParams);
                    
                    if ($assignStmt === false) {
                        throw new Exception('Failed to bulk insert machine assignments: ' . print_r(sqlsrv_errors(), true));
                    }
                }
            }
        }
        
        // 3. Update Sub-Department Assignments
        if (array_key_exists('SubDepartmentIDs', $data)) {
            $deleteSubDeptSql = "DELETE FROM ProductionPlanSubDepartments WHERE PlanID = ?";
            $deleteSubDeptStmt = sqlsrv_query($conn, $deleteSubDeptSql, [$planId]);
            
            if ($deleteSubDeptStmt === false) {
                throw new Exception('Failed to delete old sub-department assignments: ' . print_r(sqlsrv_errors(), true));
            }
            
            if (!empty($data['SubDepartmentIDs'])) {
                $subDeptIds = array_filter(array_map(function($id) {
                    $id = intval(trim($id));
                    return $id > 0 ? $id : null;
                }, explode(',', $data['SubDepartmentIDs'])));
                
                if (!empty($subDeptIds)) {
                    // สร้าง bulk insert statement
                    $subDeptValues = [];
                    $subDeptParams = [];
                    
                    foreach ($subDeptIds as $subDeptId) {
                        $subDeptValues[] = "(?, ?, ?, ?)";
                        $subDeptParams[] = $planId;
                        $subDeptParams[] = $data['DepartmentID'] ?? 0;
                        $subDeptParams[] = $subDeptId;
                        $subDeptParams[] = 'System';
                    }
                    
                    $subAssignSql = "INSERT INTO ProductionPlanSubDepartments (PlanID, DepartmentID, SubDepartmentID, CreatedBy) VALUES " 
                                   . implode(', ', $subDeptValues);
                    
                    $subAssignStmt = sqlsrv_query($conn, $subAssignSql, $subDeptParams);
                    
                    if ($subAssignStmt === false) {
                        throw new Exception('Failed to bulk insert sub-department assignments: ' . print_r(sqlsrv_errors(), true));
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

// ลบแผนงาน
if ($action === 'delete_plan') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $planId = intval($data['PlanID'] ?? 0);
        
        if ($planId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid Plan ID'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // ตรวจสอบว่าแผนงานมีอยู่จริงหรือไม่
        $checkSql = "SELECT PlanID, Status FROM ProductionPlans WHERE PlanID = ?";
        $checkStmt = sqlsrv_query($conn, $checkSql, [$planId]);
        
        if (!$checkStmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database query error', 'details' => sqlsrv_errors()], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $plan = sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC);
        if (!$plan) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'แผนงานไม่พบ'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // ตรวจสอบสถานะ - ไม่อนุญาตให้ลบงานที่กำลังดำเนินการเท่านั้น
        if ($plan['Status'] === 'in-progress') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ไม่สามารถลบงานที่กำลังดำเนินการได้'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // ลบข้อมูลที่เกี่ยวข้องก่อน (cascade delete)
        // ลบข้อมูลผลการผลิตถ้ามี
        $deleteResultsSql = "DELETE FROM ProductionResults WHERE PlanID = ?";
        $deleteResultsStmt = sqlsrv_query($conn, $deleteResultsSql, [$planId]);
        $deletedResults = $deleteResultsStmt ? sqlsrv_rows_affected($deleteResultsStmt) : 0;
        
        // ลบข้อมูล partial sessions ถ้ามี
        $deleteSessionsSql = "DELETE FROM ProductionSessions WHERE PlanID = ?";
        $deleteSessionsStmt = sqlsrv_query($conn, $deleteSessionsSql, [$planId]);
        $deletedSessions = $deleteSessionsStmt ? sqlsrv_rows_affected($deleteSessionsStmt) : 0;
        
        // ลบข้อมูลเครื่องจักร
        $deleteMachinesSql = "DELETE FROM ProductionPlanMachines WHERE PlanID = ?";
        $deleteMachinesStmt = sqlsrv_query($conn, $deleteMachinesSql, [$planId]);
        $deletedMachines = $deleteMachinesStmt ? sqlsrv_rows_affected($deleteMachinesStmt) : 0;
        
        // ลบข้อมูลแผนกย่อย
        $deleteSubDeptsSql = "DELETE FROM ProductionPlanSubDepartments WHERE PlanID = ?";
        $deleteSubDeptsStmt = sqlsrv_query($conn, $deleteSubDeptsSql, [$planId]);
        $deletedSubDepts = $deleteSubDeptsStmt ? sqlsrv_rows_affected($deleteSubDeptsStmt) : 0;
        
        // ลบแผนงานหลัก
        $sql = "DELETE FROM ProductionPlans WHERE PlanID = ?";
        $stmt = sqlsrv_query($conn, $sql, [$planId]);
        
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'ไม่สามารถลบแผนงานได้', 'details' => sqlsrv_errors()], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // สร้างข้อความแสดงผลการลบ
        $deleteInfo = [];
        if ($deletedResults > 0) $deleteInfo[] = "ผลการผลิต: {$deletedResults} รายการ";
        if ($deletedSessions > 0) $deleteInfo[] = "Partial sessions: {$deletedSessions} รายการ";
        if ($deletedMachines > 0) $deleteInfo[] = "เครื่องจักร: {$deletedMachines} รายการ";
        if ($deletedSubDepts > 0) $deleteInfo[] = "แผนกย่อย: {$deletedSubDepts} รายการ";
        
        $message = 'ลบแผนงานสำเร็จ';
        if (!empty($deleteInfo)) {
            $message .= ' (รวมลบ: ' . implode(', ', $deleteInfo) . ')';
        }
        
        echo json_encode(['success' => true, 'message' => $message], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// ดึงข้อมูลแผนงานสำหรับ confirm-complete
if ($action === 'get_plan_detail' && isset($_GET['id'])) {
    $planId = intval($_GET['id']);
    $sql = "SELECT p.*, 
                   ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName,
                   -- คำนวณ PlannedMinutes = เวลารวม - SetupMinutes - BreakTotalMinutes
                   DATEDIFF(MINUTE, p.PlannedStartTime, p.PlannedEndTime) - 
                   ISNULL(p.SetupMinutes, 0) - 
                   (ISNULL(p.BreakMorningMinutes, 0) + ISNULL(p.BreakLunchMinutes, 0) + ISNULL(p.BreakEveningMinutes, 0)) 
                   AS PlannedMinutes,
                   -- เพิ่มการดึงข้อมูล Product และ Machine ที่ชัดเจน
                   pr.ProductName as ProductFullName,
                   pr.ProductCode as ProductCode,
                   
                   -- ดึงชื่อเครื่องจักรจากตาราง ProductionPlanMachines (เหมือน get_plans)
                   STUFF((
                       SELECT ',' + m.MachineName 
                       FROM ProductionPlanMachines ppm
                       JOIN Machines m ON ppm.MachineID = m.MachineID
                       WHERE ppm.PlanID = p.PlanID
                       FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS MachineNames,
                       
                   -- ดึง Primary Machine (เครื่องแรก)
                   (SELECT TOP 1 m.MachineName 
                    FROM ProductionPlanMachines ppm
                    JOIN Machines m ON ppm.MachineID = m.MachineID
                    WHERE ppm.PlanID = p.PlanID
                    ORDER BY ppm.MachineID) AS PrimaryMachineName
                    
            FROM ProductionPlans p
            LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
            LEFT JOIN Products pr ON p.ProductName = pr.ProductName
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
    
    // จัดการ MachineName - ใช้ข้อมูลจาก JOIN แทน safeMachineNameFromIDs
    error_log("Debug Machine data from JOIN: MachineNames=" . ($row['MachineNames'] ?? 'null') . ", PrimaryMachineName=" . ($row['PrimaryMachineName'] ?? 'null'));
    
    // ลำดับความสำคัญ: MachineNames -> PrimaryMachineName -> MachineName (จาก field เดิม) -> fallback
    if (!empty($row['MachineNames'])) {
        $row['MachineName'] = $row['MachineNames']; // ใช้รายการเครื่องจักรทั้งหมด
    } else if (!empty($row['PrimaryMachineName'])) {
        $row['MachineName'] = $row['PrimaryMachineName']; // ใช้เครื่องหลัก
    } else if (empty($row['MachineName'])) {
        // ถ้าไม่มีข้อมูลจาก JOIN และ field MachineName เดิมก็ว่าง ให้ลองใช้ safeMachineNameFromIDs
        $machineIdentifier = !empty($row['MachineIDs']) ? $row['MachineIDs'] : (!empty($row['MachineID']) ? $row['MachineID'] : '');
        if (!empty($machineIdentifier)) {
            $row['MachineName'] = safeMachineNameFromIDs($conn, $machineIdentifier);
        } else {
            $row['MachineName'] = 'ไม่ระบุเครื่องจักร';
        }
    }
    
    error_log("Final MachineName result: " . $row['MachineName']);
    
    // ตรวจสอบและกำหนดค่าเริ่มต้นสำหรับ Break time และ Setup time
    $row['SetupMinutes'] = $row['SetupMinutes'] ?? 30;
    $row['SetupNote'] = $row['SetupNote'] ?? '';
    $row['BreakMorningMinutes'] = $row['BreakMorningMinutes'] ?? 0;
    $row['BreakLunchMinutes'] = $row['BreakLunchMinutes'] ?? 60;
    $row['BreakEveningMinutes'] = $row['BreakEveningMinutes'] ?? 0;
    
    // แปลง datetime fields
    $row['PlannedStartTime'] = formatDateTime($row['PlannedStartTime']);
    $row['PlannedEndTime'] = formatDateTime($row['PlannedEndTime']);
    $row['CreatedAt'] = formatDateTime($row['CreatedAt']);
    $row['UpdatedAt'] = formatDateTime($row['UpdatedAt']);
    
    // เพิ่ม debug log เพื่อตรวจสอบข้อมูล
    error_log("Plan Detail Debug - PlanID: {$planId}");
    error_log("Setup/Break Data: " . json_encode([
        'SetupMinutes' => $row['SetupMinutes'],
        'SetupNote' => $row['SetupNote'],
        'BreakMorningMinutes' => $row['BreakMorningMinutes'],
        'BreakLunchMinutes' => $row['BreakLunchMinutes'],
        'BreakEveningMinutes' => $row['BreakEveningMinutes'],
        'PlannedMinutes' => $row['PlannedMinutes']
    ]));
    
    echo json_encode(['success' => true, 'data' => $row]);
    exit;
}
?>