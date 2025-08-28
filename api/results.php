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


// Database configuration
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/plans.php';

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

// ===== PRODUCTION RESULTS APIs =====

// บันทึกผลการผลิต
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
                       ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName,
                       ISNULL(sd.SubDepartmentName, '') as SubdepartmentName
                FROM ProductionPlans p
                LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
                LEFT JOIN SubDepartments sd ON p.SubDepartmentID = sd.SubDepartmentID
                WHERE p.PlanID = ?";
    $planStmt = sqlsrv_query($conn, $planSql, [$planId]);
    if (!$planStmt || !($plan = sqlsrv_fetch_array($planStmt, SQLSRV_FETCH_ASSOC))) {
        ob_clean();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Plan not found'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // === ดึงชื่อเครื่องจักรจาก ProductionPlanMachines ===
    $machineNameFromDB = '';
    $machineQuery = "SELECT 
        STUFF((
            SELECT ',' + m.MachineName 
            FROM ProductionPlanMachines ppm
            JOIN Machines m ON ppm.MachineID = m.MachineID
            WHERE ppm.PlanID = ?
            FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS MachineNames";
    
    $machineStmt = sqlsrv_query($conn, $machineQuery, [$planId]);
    if ($machineStmt) {
        $machineResult = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC);
        $machineNameFromDB = $machineResult['MachineNames'] ?? '';
        sqlsrv_free_stmt($machineStmt);
    }
    
    // ลำดับความสำคัญของ MachineName
    // 1. จาก ProductionPlanMachines (ข้อมูลจริงจากความสัมพันธ์)
    // 2. จาก frontend (data['MachineName']) 
    // 3. จาก safeMachineNameFromIDs (MachineIDs field)
    // 4. fallback เป็น 'ไม่ระบุ'
    $machineName = 'ไม่ระบุ';
    if (!empty($machineNameFromDB)) {
        $machineName = $machineNameFromDB;
        error_log("Using MachineName from ProductionPlanMachines: {$machineName}");
    } elseif (!empty($data['MachineName'])) {
        $machineName = trim($data['MachineName']);
        error_log("Using MachineName from frontend: {$machineName}");
    } else {
        // ไม่มี MachineIDs field ในโครงสร้างใหม่แล้ว
        error_log("No MachineName found, using fallback: {$machineName}");
    }
    
    // === ตรวจสอบ Partial Sessions Support ===
    $isFromPartialSessions = isset($data['IsFromPartialSessions']) ? boolval($data['IsFromPartialSessions']) : false;
    $totalPartialSessions = isset($data['TotalPartialSessions']) ? intval($data['TotalPartialSessions']) : 0;
    
    // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
    $checkSql = "SELECT ResultID FROM ProductionResults WHERE PlanID = ?";
    $checkStmt = sqlsrv_query($conn, $checkSql, [$planId]);
    $exists = $checkStmt && sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC);
    
    try {
        // คำนวณค่าที่จำเป็น
        $totalPieces = intval($data['TotalPieces'] ?? 0);
        $rejectPieces = intval($data['RejectPieces'] ?? 0);
        $reworkPieces = intval($data['ReworkPieces'] ?? 0);
        $remark = trim($data['Remark'] ?? '');
        $breakMorning = intval($data['BreakMorningMinutes'] ?? 0);
        $breakLunch = intval($data['BreakLunchMinutes'] ?? 60);
        $breakEvening = intval($data['BreakEveningMinutes'] ?? 0);
        $shiftHours = floatval($data['ShiftHours'] ?? 8.0);
        
        // คำนวณ Working Minutes จาก ActiveWorkMinutes (เวลาทำงานสุทธิ)
        $activeWorkMinutes = intval($data['ActiveWorkMinutes'] ?? 0);
        error_log("ActiveWorkMinutes เริ่มต้น: {$activeWorkMinutes} นาที");
        
        // === Partial Sessions Support ===
        if ($isFromPartialSessions && $totalPartialSessions > 0) {
            $remark = ($remark ? $remark . ' | ' : '') . "รวมจาก {$totalPartialSessions} partial sessions";
            
            // ActiveWorkMinutes จาก frontend มีการรวม partial sessions แล้ว
            // ไม่ต้องรวมอีก เพราะ confirm-complete.js รวมให้แล้ว
            error_log("ActiveWorkMinutes จาก frontend (รวม sessions แล้ว): {$activeWorkMinutes} นาที");
        }
        
        // จัดการ Unicode และ String Length
        $safeMachineName = mb_substr($machineName, 0, 200, 'UTF-8');
        $safeDepartment = mb_substr($plan['DepartmentName'] ?? 'ไม่ระบุ', 0, 200, 'UTF-8');
        // รองรับหลายแผนกย่อย: ถ้า data[SubdepartmentName] มีค่า (string หรือ array) ให้ใช้ค่านี้ก่อน
        $subdepartmentName = '';
        if (!empty($data['SubdepartmentName'])) {
            if (is_array($data['SubdepartmentName'])) {
                $subdepartmentName = implode(', ', array_map('trim', $data['SubdepartmentName']));
            } else {
                $subdepartmentName = trim($data['SubdepartmentName']);
            }
        } else {
            $subdepartmentName = $plan['SubdepartmentName'] ?? '';
        }
        $safeSubdepartment = mb_substr($subdepartmentName, 0, 200, 'UTF-8');
        
        $params = [
            $planId,
            mb_substr($plan['ProductName'] ?? 'ไม่ระบุ', 0, 200, 'UTF-8'),
            mb_substr($plan['ProductSize'] ?? '', 0, 30, 'UTF-8'),
            $safeDepartment,
            $safeSubdepartment,
            $safeMachineName,
            mb_substr($plan['OrderNumber'] ?? '', 0, 50, 'UTF-8'),
            date('Y-m-d'),
            $data['ActualStartTime'] ?? '1900-01-01 00:00:00',
            $data['ActualEndTime'] ?? '1900-01-01 01:00:00',
            $data['PlannedStartTime'] ?? null,
            $data['PlannedEndTime'] ?? null,
            $data['Status'] ?? 'completed',
            $shiftHours,
            intval($data['OvertimeMinutes'] ?? 0),
            $breakMorning,
            $breakLunch,
            $breakEvening,
            max(0.1, floatval($data['StandardRunRate'] ?? 1.0)),
            $totalPieces,
            $rejectPieces,
            $reworkPieces,
            mb_substr($remark, 0, 1000, 'UTF-8'),
            intval($data['DowntimeMinutes'] ?? 0),
            substr($data['DowntimeReason'] ?? '', 0, 1000),
            max(1, intval($data['PlannedWorkMinutes'] ?? 480)),
            max(0, $activeWorkMinutes), // ใช้ ActiveWorkMinutes ที่รวมจาก partial sessions แล้ว
            max(0, min(100, floatval($data['OEE_Availability'] ?? 0))),
            max(0, min(100, floatval($data['OEE_Performance'] ?? 0))),
            max(0, min(100, floatval($data['OEE_Quality'] ?? 0))),
            max(0, min(100, floatval($data['OEE_Overall'] ?? 0))),
            floatval($data['ActualRunRate'] ?? 0),
            $data['ConfirmedByUserName'] ?? 'System'
        ];
        
        if ($exists) {
            $updateParams = array_slice($params, 1);
            $updateParams[] = $planId;
            
            $sql = "UPDATE ProductionResults SET
                ProductName=?, ProductSize=?, Department=?, SubdepartmentName=?, MachineName=?,
                OrderNumber=?, ProductionDate=?, ActualStartTime=?, ActualEndTime=?,
                PlannedStartTime=?, PlannedEndTime=?, Status=?,
                ShiftHours=?, OvertimeMinutes=?, BreakMorningMinutes=?, BreakLunchMinutes=?,
                BreakEveningMinutes=?, StandardRunRate=?, TotalPieces=?, RejectPieces=?,
                ReworkPieces=?, Remark=?, DowntimeMinutes=?, DowntimeReason=?, PlannedWorkMinutes=?,
                ActiveWorkMinutes=?, OEE_Availability=?, OEE_Performance=?, OEE_Quality=?,
                OEE_Overall=?, ActualRunRate=?, ConfirmedByUserName=?,
                ConfirmedAt=GETDATE()
                WHERE PlanID=?";
            $params = $updateParams;
        } else {
            $sql = "INSERT INTO ProductionResults (
                PlanID, ProductName, ProductSize, Department, SubdepartmentName, MachineName,
                OrderNumber, ProductionDate, ActualStartTime, ActualEndTime,
                PlannedStartTime, PlannedEndTime, Status,
                ShiftHours, OvertimeMinutes, BreakMorningMinutes, BreakLunchMinutes,
                BreakEveningMinutes, StandardRunRate, TotalPieces, RejectPieces,
                ReworkPieces, Remark, DowntimeMinutes, DowntimeReason, PlannedWorkMinutes,
                ActiveWorkMinutes, OEE_Availability, OEE_Performance, OEE_Quality,
                OEE_Overall, ActualRunRate, ConfirmedByUserName
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        }
        
        error_log("จะบันทึก ActiveWorkMinutes รวม: {$activeWorkMinutes} นาที");
        
        $stmt = sqlsrv_query($conn, $sql, $params);
        if (!$stmt) {
            $errors = sqlsrv_errors();
            throw new Exception('Database operation failed: ' . print_r($errors, true));
        }
        
        // อัปเดต ConfirmedAt สำหรับ INSERT
        if (!$exists) {
            $updateConfirmedSql = "UPDATE ProductionResults SET ConfirmedAt = GETDATE() WHERE PlanID = ?";
            sqlsrv_query($conn, $updateConfirmedSql, [$planId]);
        }
        
        // อัปเดตสถานะแผนงาน
        $updatePlanSql = "UPDATE ProductionPlans SET Status='completed', TargetOutput=? WHERE PlanID=?";
        sqlsrv_query($conn, $updatePlanSql, [$totalPieces, $planId]);
        
        ob_clean();
        echo json_encode([
            'success' => true, 
            'message' => 'บันทึกข้อมูลสำเร็จ',
            'data' => [
                'PlanID' => $planId,
                'MachineName' => $machineName,
                'MachineSource' => !empty($machineNameFromDB) ? 'ProductionPlanMachines' : 
                                 (!empty($data['MachineName']) ? 'Frontend' : 'Fallback'),
                'SubdepartmentName' => $safeSubdepartment,
                'SubdepartmentSource' => !empty($data['SubdepartmentName']) ? 'Frontend' : 'FromPlan',
                'IsUpdate' => $exists ? true : false
            ]
        ], JSON_UNESCAPED_UNICODE);
        
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

// ดึงผลการผลิต
if ($action === 'get_production_results') {
    $planId = isset($_GET['PlanID']) ? intval($_GET['PlanID']) : 0;
    
    if ($planId > 0) {
        $sql = "SELECT * FROM ProductionResults WHERE PlanID = ?";
        $stmt = sqlsrv_query($conn, $sql, [$planId]);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        
        $result = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if ($result) {
            $result['ActualStartTime'] = formatDateTime($result['ActualStartTime']);
            $result['ActualEndTime'] = formatDateTime($result['ActualEndTime']);
            $result['ConfirmedAt'] = formatDateTime($result['ConfirmedAt']);
            $result['ProductionDate'] = formatDate($result['ProductionDate']);
        }
        
        echo $result ? json_encode($result) : json_encode(['error' => 'Production result not found']);
        exit;
    } else {
        $sql = "SELECT * FROM ProductionResults ORDER BY ConfirmedAt DESC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        
        $results = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $row['ActualStartTime'] = formatDateTime($row['ActualStartTime']);
            $row['ActualEndTime'] = formatDateTime($row['ActualEndTime']);
            $row['ConfirmedAt'] = formatDateTime($row['ConfirmedAt']);
            $row['ProductionDate'] = formatDate($row['ProductionDate']);
            $results[] = $row;
        }
        
        echo json_encode($results);
        exit;
    }
}

// ดึงแผนงานที่เสร็จสิ้น
if ($action === 'get_completed_plans') {
    $sql = "SELECT pr.*, 
                   p.LotNumber, p.LotSize, p.WorkerCount,
                   p.PlannedStartTime, p.PlannedEndTime, p.Details as PlanDetails,
                   ISNULL(d.DepartmentName, pr.Department) as DepartmentName,
                   (SELECT STRING_AGG(m.MachineName, ', ') 
                    FROM ProductionPlanMachines ppm 
                    INNER JOIN Machines m ON ppm.MachineID = m.MachineID 
                    WHERE ppm.PlanID = p.PlanID) as PlanMachines
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
        // ใช้ MachineName จาก ProductionResults ตรงๆ แล้ว
        // ถ้าไม่มีใน ProductionResults ให้ใช้จาก PlanMachines
        if (!$row['MachineName'] && $row['PlanMachines']) {
            $row['MachineName'] = $row['PlanMachines'];
        }
        
        // แปลง datetime fields
        $row['ActualStartTime'] = formatDateTime($row['ActualStartTime']);
        $row['ActualEndTime'] = formatDateTime($row['ActualEndTime']);
        $row['ConfirmedAt'] = formatDateTime($row['ConfirmedAt']);
        $row['ProductionDate'] = formatDate($row['ProductionDate']);
        $row['PlannedStartTime'] = formatDateTime($row['PlannedStartTime']);
        $row['PlannedEndTime'] = formatDateTime($row['PlannedEndTime']);
        
        // เพิ่มข้อมูลเพื่อความเข้ากันได้
        $row['ProductDisplayName'] = $row['ProductName'];
        $row['DepartmentName'] = $row['Department'];
        $row['Status'] = 'completed';
        
        $history[] = $row;
    }
    echo json_encode($history);
    exit;
}

// Handler สำหรับ get_plan_detail (confirm-complete page)
if ($action === 'get_plan_detail') {
    $planId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($planId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid Plan ID'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    try {
        // ดึงข้อมูลแผนงานพร้อมข้อมูลที่เกี่ยวข้อง
        $sql = "SELECT pp.*, 
                       pr.ProductName, pr.ProductSize,
                       d.DepartmentName,
                       STUFF((
                           SELECT ', ' + m.MachineName 
                           FROM ProductionPlanMachines ppm
                           JOIN Machines m ON ppm.MachineID = m.MachineID
                           WHERE ppm.PlanID = pp.PlanID
                           FOR XML PATH(''), TYPE
                       ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS MachineNames,
                       (SELECT COUNT(*) FROM ProductionSessions WHERE PlanID = pp.PlanID) as SessionCount
                FROM ProductionPlans pp
                LEFT JOIN Products pr ON pp.ProductID = pr.ProductID
                LEFT JOIN Departments d ON pp.DepartmentID = d.DepartmentID
                WHERE pp.PlanID = ?";
        
        $stmt = sqlsrv_query($conn, $sql, [$planId]);
        
        if ($stmt === false) {
            $errors = sqlsrv_errors();
            error_log('get_plan_detail query failed: ' . print_r($errors, true));
            throw new Exception('Database query failed: ' . print_r($errors, true));
        }
        
        $plan = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        if (!$plan) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Plan not found with ID: ' . $planId
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // แปลง DateTime objects เป็น strings
        foreach (['PlannedStartTime', 'PlannedEndTime', 'CreatedAt', 'UpdatedAt'] as $dateField) {
            if (isset($plan[$dateField]) && $plan[$dateField]) {
                $plan[$dateField] = formatDateTime($plan[$dateField]);
            }
        }
        
        // เพิ่มค่าที่จำเป็นสำหรับ backward compatibility
        $plan['ProductDisplayName'] = $plan['ProductName'] ?? 'ไม่ระบุ';
        
        // ตั้งค่าเริ่มต้นสำหรับ fields ที่อาจเป็น null
        $plan['SetupMinutes'] = $plan['SetupMinutes'] ?? 30;
        $plan['SetupNote'] = $plan['SetupNote'] ?? '';
        $plan['BreakMorningMinutes'] = $plan['BreakMorningMinutes'] ?? 0;
        $plan['BreakLunchMinutes'] = $plan['BreakLunchMinutes'] ?? 60;
        $plan['BreakEveningMinutes'] = $plan['BreakEveningMinutes'] ?? 0;
        $plan['DowntimeMinutes'] = $plan['DowntimeMinutes'] ?? 0;
        $plan['DowntimeReason'] = $plan['DowntimeReason'] ?? '';
        
        echo json_encode([
            'success' => true,
            'data' => $plan
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        error_log("get_plan_detail error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database error occurred',
            'details' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
    
    exit;
}
?>