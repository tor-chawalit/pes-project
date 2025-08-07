<?php
// ===== ป้องกัน output HTML หรือ error ที่ไม่ใช่ JSON =====
ob_start(); // เริ่ม output buffering
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0); // ไม่แสดง error บนหน้าเว็บ
ini_set('log_errors', 1);
// ini_set('error_log', __DIR__ . '/php-error.log');

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
function validatePlanStatus($status) {
    $validStatuses = [
        'planning',
        'in-progress', 
        'pending-confirmation',
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
if (isset($_GET['action'])) {
    $action = $_GET['action'];
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
    // ดึงแผนงานทั้งหมดจาก ProductionPlans (รวมทั้งที่เสร็จแล้ว)
    if ($action === 'get_plans') {
        $sql = "SELECT p.*, 
                       ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName
                FROM ProductionPlans p
                LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
                ORDER BY p.CreatedAt ASC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $plans = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
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
            
            $plans[] = $row;
        }
        echo json_encode($plans);
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
            $row['PlanStatus'] = 'completed';
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
    // เพิ่มแผนงานใหม่ลง ProductionPlans
    if ($action === 'add_plan') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lookup DepartmentName from DepartmentID
        $departmentName = '';
        if (!empty($data['DepartmentID'])) {
            $deptSql = "SELECT DepartmentName FROM Departments WHERE DepartmentID = ?";
            $deptStmt = sqlsrv_query($conn, $deptSql, [(int)$data['DepartmentID']]);
            if ($deptStmt && $deptRow = sqlsrv_fetch_array($deptStmt, SQLSRV_FETCH_ASSOC)) {
                $departmentName = $deptRow['DepartmentName'];
            }
        }
        
        // Lookup MachineName(s) จาก MachineIDs หรือ MachineID
        $machineName = '';
        if (!empty($data['MachineIDs'])) {
            // ถ้ามีหลายเครื่อง ให้ lookup ชื่อทั้งหมด
            $machineIds = explode(',', $data['MachineIDs']);
            $machineNames = [];
            
            foreach ($machineIds as $mid) {
                $mid = intval(trim($mid));
                if ($mid > 0) {
                    $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
                    $machineStmt = sqlsrv_query($conn, $machineSql, [$mid]);
                    if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                        $machineNames[] = $machineRow['MachineName'];
                    }
                }
            }
            
            $machineName = implode(', ', $machineNames);
        } else if (!empty($data['MachineID'])) {
            // ถ้ามีแค่เครื่องเดียว
            $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
            $machineStmt = sqlsrv_query($conn, $machineSql, [(int)$data['MachineID']]);
            if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                $machineName = $machineRow['MachineName'];
            }
        }
        
        // ตรวจสอบ PlanStatus ก่อนบันทึก
        $planStatus = $data['PlanStatus'] ?? 'planning';
        if (!validatePlanStatus($planStatus)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid plan status: ' . $planStatus]);
            exit;
        }
        
        // รวม fields ที่จำเป็น รวมทั้ง DepartmentName และ MachineName
        $fields = ['LotNumber', 'LotSize', 'TargetOutput', 'WorkerCount', 'ProductName', 'ProductSize', 'DepartmentID', 'DepartmentName', 'MachineID', 'MachineIDs', 'MachineName', 'PlanStatus', 'PlannedStartTime', 'PlannedEndTime', 'Details', 'CreatedByUserID', 'UpdatedByUserID'];
        $params = [
            $data['LotNumber'] ?? '',
            (int)($data['LotSize'] ?? 0),
            (int)($data['TargetOutput'] ?? 0),
            (int)($data['WorkerCount'] ?? 0),
            $data['ProductName'] ?? '',
            $data['ProductSize'] ?? '',
            (int)($data['DepartmentID'] ?? 0),
            $departmentName,
            (int)($data['MachineID'] ?? 0),
            $data['MachineIDs'] ?? '',
            $machineName,
            $planStatus,
            $data['PlannedStartTime'] ?? null,
            $data['PlannedEndTime'] ?? null,
            $data['Details'] ?? '',
            (int)($data['CreatedByUserID'] ?? 0),
            (int)($data['UpdatedByUserID'] ?? 0)
        ];
        
        $placeholders = str_repeat('?,', count($fields) - 1) . '?';
        $sql = "INSERT INTO ProductionPlans (" . implode(', ', $fields) . ") VALUES ($placeholders)";
        
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        
        // ดึง PlanID ที่เพิ่งสร้างขึ้น
        $newPlanId = null;
        $lastIdSql = "SELECT SCOPE_IDENTITY() as LastID";
        $lastIdStmt = sqlsrv_query($conn, $lastIdSql);
        if ($lastIdStmt) {
            $lastIdRow = sqlsrv_fetch_array($lastIdStmt, SQLSRV_FETCH_ASSOC);
            if ($lastIdRow) {
                $newPlanId = intval($lastIdRow['LastID']);
            }
        }
        
        echo json_encode(['success' => true, 'planId' => $newPlanId]);
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
    // อัปเดตแผนงานใน ProductionPlans
    if ($action === 'update_plan') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            error_log('DEBUG: update_plan $data is not array: ' . var_export($data, true));
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            exit;
        }
        
        $planId = isset($data['PlanID']) ? intval($data['PlanID']) : intval($data['id'] ?? 0);
        if ($planId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid PlanID']);
            exit;
        }
        
        $fields = [];
        $params = [];
        
        // Lookup DepartmentName หาก DepartmentID ถูกส่งมา
        if (array_key_exists('DepartmentID', $data) && !empty($data['DepartmentID'])) {
            $deptSql = "SELECT DepartmentName FROM Departments WHERE DepartmentID = ?";
            $deptStmt = sqlsrv_query($conn, $deptSql, [(int)$data['DepartmentID']]);
            if ($deptStmt && $deptRow = sqlsrv_fetch_array($deptStmt, SQLSRV_FETCH_ASSOC)) {
                $data['DepartmentName'] = $deptRow['DepartmentName'];
            }
        }
        
        // Lookup MachineName หาก MachineID หรือ MachineIDs ถูกส่งมา
        if (array_key_exists('MachineIDs', $data) && !empty($data['MachineIDs'])) {
            // ถ้ามีหลายเครื่อง ให้ lookup ชื่อทั้งหมด
            $machineIds = explode(',', $data['MachineIDs']);
            $machineNames = [];
            
            foreach ($machineIds as $mid) {
                $mid = intval(trim($mid));
                if ($mid > 0) {
                    $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
                    $machineStmt = sqlsrv_query($conn, $machineSql, [$mid]);
                    if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                        $machineNames[] = $machineRow['MachineName'];
                    }
                }
            }
            
            $data['MachineName'] = implode(', ', $machineNames);
        } else if (array_key_exists('MachineID', $data) && !empty($data['MachineID'])) {
            // ถ้ามีแค่เครื่องเดียว
            $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
            $machineStmt = sqlsrv_query($conn, $machineSql, [(int)$data['MachineID']]);
            if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                $data['MachineName'] = $machineRow['MachineName'];
            }
        }
        
        // ตรวจสอบ PlanStatus ก่อนอัปเดต (ถ้ามีการเปลี่ยนแปลง)
        if (array_key_exists('PlanStatus', $data) && !validatePlanStatus($data['PlanStatus'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid plan status: ' . $data['PlanStatus']]);
            exit;
        }
        
        // รายการฟิลด์ที่สามารถอัปเดตได้ (รวม DepartmentName, MachineName)
        $updatable = ['LotNumber', 'LotSize', 'TargetOutput', 'WorkerCount', 'ProductName', 'ProductSize', 'DepartmentID', 'DepartmentName', 'MachineID', 'MachineIDs', 'MachineName', 'PlanStatus', 'PlannedStartTime', 'PlannedEndTime', 'Details', 'UpdatedByUserID'];
        foreach ($updatable as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field=?";
                $params[] = $data[$field];
            }
        }
        
        // เพิ่ม debug logging
        error_log('DEBUG: Update PlanID=' . $planId);
        error_log('DEBUG: Update fields: ' . print_r($fields, true));
        error_log('DEBUG: Update params: ' . print_r($params, true));
        
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            exit;
        }
        
        // เพิ่ม UpdatedAt อัตโนมัติ
        $fields[] = "UpdatedAt=GETDATE()";
        
        $sql = "UPDATE ProductionPlans SET ".implode(", ", $fields)." WHERE PlanID=?";
        $params[] = $planId;
        
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
            echo json_encode(['error' => 'Plan not found or no changes made']);
            exit;
        }
        
        echo json_encode(['success' => true, 'rowsAffected' => $rowsAffected]);
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
        
        // จัดการ MachineName
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
                        $machineNames[] = $machineRow['MachineName'];
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
                $machineName = $machineRow['MachineName'];
            }
        }
        
        // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
        $checkSql = "SELECT ResultID FROM ProductionResults WHERE PlanID = ?";
        $checkStmt = sqlsrv_query($conn, $checkSql, [$planId]);
        $exists = $checkStmt && sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC);
        
        try {
            // Log ข้อมูลที่ได้รับเพื่อ debug
            error_log("Received data: " . json_encode($data));
            error_log("Plan data: " . json_encode($plan));
            
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
            
            // เตรียมข้อมูลสำหรับบันทึก (ไม่รวม computed columns)
            $params = [
                $planId,                                                        // PlanID
                substr($plan['ProductName'], 0, 50),                            // ProductCode
                substr($plan['ProductName'], 0, 255),                           // ProductName
                substr($plan['ProductSize'] ?? '', 0, 30),                      // ProductSize
                substr($plan['DepartmentName'] ?? 'ไม่ระบุ', 0, 50),            // Department
                substr($machineName, 0, 100),                                   // MachineName
                substr($plan['ShiftName'] ?? 'Day Shift', 0, 20),               // ShiftName
                date('Y-m-d'),                                                  // ProductionDate
                $data['ActualStartTime'] ?? null,                               // ActualStartTime
                $data['ActualEndTime'] ?? null,                                 // ActualEndTime
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
                intval($data['ConfirmedByUserID'] ?? 1),                        // ConfirmedByUserID
                $data['ConfirmedByUserName'] ?? 'System'                        // ConfirmedByUserName
                // WorkingHours, TotalBreakMinutes, GoodQuantity เป็น computed columns
                // ConfirmedAt จะถูกตั้งค่าโดย GETDATE() ใน SQL
            ];
            
            if ($exists) {
                // UPDATE (ไม่รวม computed columns)
                $sql = "UPDATE ProductionResults SET
                    ProductCode=?, ProductName=?, ProductSize=?, Department=?, MachineName=?,
                    ShiftName=?, ProductionDate=?, ActualStartTime=?, ActualEndTime=?,
                    ShiftHours=?, OvertimeMinutes=?, BreakMorningMinutes=?, BreakLunchMinutes=?,
                    BreakEveningMinutes=?, StandardRunRate=?, TotalPieces=?, RejectPieces=?,
                    DowntimeMinutes=?, DowntimeReason=?, PlannedWorkMinutes=?,
                    ActiveWorkMinutes=?, OEE_Availability=?, OEE_Performance=?, OEE_Quality=?,
                    OEE_Overall=?, ActualRunRate=?, ConfirmedByUserID=?, ConfirmedByUserName=?,
                    ConfirmedAt=GETDATE()
                    WHERE PlanID=?";
                $params[] = $planId; // เพิ่ม PlanID สำหรับ WHERE clause
            } else {
                // INSERT (ไม่รวม computed columns)
                $sql = "INSERT INTO ProductionResults (
                    PlanID, ProductCode, ProductName, ProductSize, Department, MachineName,
                    ShiftName, ProductionDate, ActualStartTime, ActualEndTime,
                    ShiftHours, OvertimeMinutes, BreakMorningMinutes, BreakLunchMinutes,
                    BreakEveningMinutes, StandardRunRate, TotalPieces, RejectPieces,
                    DowntimeMinutes, DowntimeReason, PlannedWorkMinutes,
                    ActiveWorkMinutes, OEE_Availability, OEE_Performance, OEE_Quality,
                    OEE_Overall, ActualRunRate, ConfirmedByUserID, ConfirmedByUserName
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            }
            
            // Log SQL statement และ parameters เพื่อ debug
            error_log("SQL: " . $sql);
            error_log("Parameters count: " . count($params));
            error_log("Parameters: " . json_encode($params));
            
            $stmt = sqlsrv_query($conn, $sql, $params);
            if (!$stmt) {
                $errors = sqlsrv_errors();
                throw new Exception('Database operation failed: ' . print_r($errors, true));
            }
            
            // ถ้าเป็น INSERT ให้อัปเดต ConfirmedAt แยกต่างหาก
            if (!$exists) {
                $updateConfirmedSql = "UPDATE ProductionResults SET ConfirmedAt = GETDATE() WHERE PlanID = ?";
                sqlsrv_query($conn, $updateConfirmedSql, [$planId]);
            }
            
            // อัปเดตสถานะแผนงาน
            $updatePlanSql = "UPDATE ProductionPlans SET PlanStatus='completed', TargetOutput=? WHERE PlanID=?";
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
    
    http_response_code(400);
    echo json_encode(['error' => 'Unknown action']);
    exit;
}
// ===== END REST API =====
?>
