<?php
// production-sessions.php - API แบบง่ายสำหรับจัดการ Production Sessions
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';


// ตรวจสอบการเชื่อมต่อฐานข้อมูล
if (!$conn) {
    http_response_code(response_code: 500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed'
    ]);
    exit;
}

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get_progress':
            echo json_encode(getProgress($_GET['plan_id']));
            break;
            
        case 'save_session':
            $data = json_decode(file_get_contents('php://input'), true);
            echo json_encode(saveSession($data));
            break;
            
        case 'save_partial_confirmation':
            $data = json_decode(file_get_contents('php://input'), true);
            echo json_encode(savePartialConfirmation($data));
            break;
            
        case 'get_sessions':
            echo json_encode(getSessions($_GET['plan_id']));
            break;
            
        case 'get_plan_status':
            echo json_encode(getPlanStatus($_GET['plan_id']));
            break;
            
        case 'get_session_summary':
            echo json_encode(getSessionSummary($_GET['plan_id']));
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

/**
 * ดึงสถานะความคืบหน้าของแผนงาน
 */
function getProgress($planId) {
    global $conn;
    
    if (!$planId) {
        return [
            'success' => false,
            'error' => 'Plan ID is required'
        ];
    }
    
    // Debug: แสดง Plan ID ที่ได้รับ
    error_log("Received Plan ID: " . $planId);
    
    try {
        // ดึงข้อมูลแผนงาน (ตรงตามโครงสร้างตารางจริง)
        $planQuery = "
            SELECT 
                PlanID,
                TargetOutput
            FROM ProductionPlans
            WHERE PlanID = ?
        ";
        
        $stmt = sqlsrv_prepare($conn, $planQuery, array($planId));
        if (!$stmt) {
            throw new Exception('Failed to prepare plan query: ' . print_r(sqlsrv_errors(), true));
        }
        
        $result = sqlsrv_execute($stmt);
        if (!$result) {
            throw new Exception('Failed to execute plan query: ' . print_r(sqlsrv_errors(), true));
        }
        
        $planData = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if (!$planData) {
            // Debug: แสดงรายละเอียดเมื่อไม่เจอ Plan
            error_log("Plan not found for ID: " . $planId);
            error_log("Query executed: " . $planQuery);
            
            return [
                'success' => false,
                'error' => "Plan not found for ID: {$planId}"
            ];
        }
        
        // Debug: แสดงข้อมูลที่เจอ
        error_log("Plan found: " . print_r($planData, true));
        
        // ดึงข้อมูลการผลิตที่มีอยู่แล้ว (ถ้ามี)
        $sessionsQuery = "
            SELECT 
                COUNT(*) as TotalSessions,
                ISNULL(SUM(SessionQuantity), 0) as TotalProduced,
                ISNULL(SUM(SessionRejectQuantity), 0) as TotalRejects,
                ISNULL(SUM(SessionReworkQuantity), 0) as TotalRework,
                ISNULL(SUM(SessionQuantity - SessionRejectQuantity), 0) as TotalGoodQuantity
            FROM ProductionSessions 
            WHERE PlanID = ?
        ";
        
        $sessionsStmt = sqlsrv_prepare($conn, $sessionsQuery, array($planId));
        if ($sessionsStmt && sqlsrv_execute($sessionsStmt)) {
            $sessionsData = sqlsrv_fetch_array($sessionsStmt, SQLSRV_FETCH_ASSOC);
        } else {
            // Debug: แสดง error ของ sessions query
            error_log('Sessions Query Error: ' . print_r(sqlsrv_errors(), true));
            // ถ้าตาราง ProductionSessions ยังไม่มี ให้ใช้ค่าเริ่มต้น
            $sessionsData = [
                'TotalSessions' => 0,
                'TotalProduced' => 0,
                'TotalRejects' => 0,
                'TotalRework' => 0,
                'TotalGoodQuantity' => 0
            ];
        }
        
        // คำนวณข้อมูลสถานะ
        $targetOutput = (int)$planData['TargetOutput'];
        $totalProduced = (int)$sessionsData['TotalGoodQuantity'];
        $remainingQuantity = max(0, $targetOutput - $totalProduced);
        $currentSession = (int)$sessionsData['TotalSessions'] + 1;
        $isCompleted = $remainingQuantity <= 0;
        
        return [
            'success' => true,
            'data' => [
                'planInfo' => [
                    'planId' => (int)$planData['PlanID'],
                    'productName' => 'ไม่ระบุ',
                    'productSize' => '',
                    'departmentName' => 'ไม่ระบุ',
                    'subDepartment' => 'ไม่ระบุ',
                    'machineName' => 'ไม่ระบุ',
                    'lotNumber' => '',
                    'plannedStartDate' => '',
                    'plannedStartTime' => '',
                    'plannedEndTime' => '',
                    'standardRunRate' => 0
                ],
                'targetOutput' => $targetOutput,
                'totalProduced' => $totalProduced,
                'totalRejects' => (int)$sessionsData['TotalRejects'],
                'totalRework' => (int)$sessionsData['TotalRework'],
                'remainingQuantity' => $remainingQuantity,
                'currentSession' => $currentSession,
                'totalSessions' => (int)$sessionsData['TotalSessions'],
                'isCompleted' => $isCompleted
            ]
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * ดึงข้อมูลความคืบหน้าแบบง่าย (ใช้สำหรับการคำนวณ)
 */
function getProgressSimple($planId) {
    
    if (!$planId) {
        throw new Exception('Plan ID is required');
    }
    
    // ดึง target จากแผนงาน
    $targetSql = "SELECT TargetOutput, ProductName, ProductSize, DepartmentName, MachineName 
                  FROM ProductionPlans 
                  LEFT JOIN Products ON ProductionPlans.ProductID = Products.ProductID
                  LEFT JOIN Departments ON ProductionPlans.DepartmentID = Departments.DepartmentID  
                  LEFT JOIN Machines ON ProductionPlans.MachineID = Machines.MachineID
                  WHERE ProductionPlans.PlanID = ?";
    
    $targetStmt = sqlsrv_query($conn, $targetSql, [$planId]);
    
    if (!$targetStmt || !($planData = sqlsrv_fetch_array($targetStmt, SQLSRV_FETCH_ASSOC))) {
        throw new Exception('Plan not found');
    }
    
    $targetOutput = (int)$planData['TargetOutput'];
    
    // รวมผลผลิตจาก sessions ทั้งหมด
    $sessionsSql = "SELECT 
                        ISNULL(SUM(SessionQuantity - SessionRejectQuantity), 0) as TotalProduced,
                        ISNULL(SUM(SessionReworkQuantity), 0) as TotalRework,
                        COUNT(*) as TotalSessions,
                        MAX(SessionNumber) as LastSession
                    FROM ProductionSessions 
                    WHERE PlanID = ?";
                    
    $sessionsStmt = sqlsrv_query($conn, $sessionsSql, [$planId]);
    $sessionData = sqlsrv_fetch_array($sessionsStmt, SQLSRV_FETCH_ASSOC);
    
    $totalProduced = (int)($sessionData['TotalProduced'] ?? 0);
    $totalRework = (int)($sessionData['TotalRework'] ?? 0);
    $totalSessions = (int)($sessionData['TotalSessions'] ?? 0);
    $lastSession = (int)($sessionData['LastSession'] ?? 0);
    
    $remaining = max(0, $targetOutput - $totalProduced);
    $isCompleted = $remaining <= 0;
    
    return [
        'success' => true,
        'data' => [
            'planInfo' => [
                'productName' => $planData['ProductName'],
                'productSize' => $planData['ProductSize'],
                'departmentName' => $planData['DepartmentName'],
                'machineName' => $planData['MachineName']
            ],
            'targetOutput' => $targetOutput,
            'totalProduced' => $totalProduced,
            'totalRework' => $totalRework,
            'remainingQuantity' => $remaining,
            'isCompleted' => $isCompleted,
            'totalSessions' => $totalSessions,
            'lastSession' => $lastSession,
            'currentSession' => $lastSession + 1,
            'completionPercentage' => $targetOutput > 0 ? round(($totalProduced / $targetOutput) * 100, 2) : 0
        ]
    ];
}

/**
 * บันทึก session ใหม่
 */
function saveSession($data) {
    global $conn;
    
    if (!$data || !isset($data['PlanID'])) {
        throw new Exception('Invalid data');
    }
    
    $planId = (int)$data['PlanID'];
    
    try {
        // เริ่ม Transaction
        sqlsrv_begin_transaction($conn);
        
        // หา session number ถัดไป
        $nextSessionSql = "SELECT ISNULL(MAX(SessionNumber), 0) + 1 as NextSession 
                          FROM ProductionSessions WHERE PlanID = ?";
        $stmt = sqlsrv_query($conn, $nextSessionSql, [$planId]);
        $nextSession = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)['NextSession'];
        
        // บันทึก session
        $insertSql = "INSERT INTO ProductionSessions (
            PlanID, SessionNumber, 
            ActualStartDateTime, ActualEndDateTime,
            SessionQuantity, SessionRejectQuantity, SessionReworkQuantity,
            BreakMorningMinutes, BreakLunchMinutes, BreakEveningMinutes,
            DowntimeMinutes, DowntimeReason,
            Remark, CreatedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $params = [
            $planId, 
            $nextSession,
            $data['ActualStartTime'] ?? date('Y-m-d H:i:s'),
            $data['ActualEndTime'] ?? date('Y-m-d H:i:s'),
            (int)($data['SessionQuantity'] ?? 0),
            (int)($data['SessionRejectQuantity'] ?? 0),
            (int)($data['SessionReworkQuantity'] ?? 0),
            (int)($data['BreakMorningMinutes'] ?? 0),
            (int)($data['BreakLunchMinutes'] ?? 0),
            (int)($data['BreakEveningMinutes'] ?? 0),
            (int)($data['DowntimeMinutes'] ?? 0),
            $data['DowntimeReason'] ?? '',
            $data['Remark'] ?? '',
            $data['CreatedBy'] ?? 'User'
        ];
        
        $insertStmt = sqlsrv_query($conn, $insertSql, $params);
        
        if (!$insertStmt) {
            throw new Exception('Failed to save session: ' . print_r(sqlsrv_errors(), true));
        }
        
        // ดึงข้อมูลความคืบหน้าใหม่
        $progress = getProgress($planId);
        
        // ถ้าเสร็จแล้ว อัปเดตสถานะแผนงาน
        if ($progress['data']['isCompleted']) {
            $updatePlanSql = "UPDATE ProductionPlans SET Status = 'completed' WHERE PlanID = ?";
            sqlsrv_query($conn, $updatePlanSql, [$planId]);
        }
        
        // Commit Transaction
        sqlsrv_commit($conn);
        
        $message = $progress['data']['isCompleted'] ? 
            '🎉 เสร็จสิ้นครบเป้าหมายแล้ว!' : 
            "✅ บันทึก Session {$nextSession} สำเร็จ (คงเหลือ {$progress['data']['remainingQuantity']} ชิ้น)";
        
        return [
            'success' => true,
            'message' => $message,
            'data' => [
                'sessionNumber' => $nextSession,
                'progress' => $progress['data']
            ]
        ];
        
    } catch (Exception $e) {
        // Rollback Transaction
        sqlsrv_rollback($conn);
        throw $e;
    }
}

/**
 * ดึงรายการ sessions ทั้งหมดของแผนงาน
 */
function getSessions($planId) {
    global $conn;
    
    if (!$planId) {
        throw new Exception('Plan ID is required');
    }
    
    $sql = "SELECT 
                SessionID,
                SessionNumber,
                ActualStartDateTime,
                ActualEndDateTime,
                SessionQuantity,
                SessionRejectQuantity,
                SessionReworkQuantity,
                (SessionQuantity - SessionRejectQuantity) as SessionGoodQuantity,
                BreakMorningMinutes + BreakLunchMinutes + BreakEveningMinutes as TotalBreakMinutes,
                DowntimeMinutes,
                DowntimeReason,
                Remark,
                CreatedAt,
                CreatedBy,
                -- คำนวณเวลาทำงาน
                DATEDIFF(MINUTE, ActualStartDateTime, ActualEndDateTime) as TotalMinutes,
                DATEDIFF(MINUTE, ActualStartDateTime, ActualEndDateTime) 
                - BreakMorningMinutes - BreakLunchMinutes - BreakEveningMinutes 
                - DowntimeMinutes as WorkingMinutes
            FROM ProductionSessions 
            WHERE PlanID = ? 
            ORDER BY SessionNumber";
            
    $stmt = sqlsrv_query($conn, $sql, [$planId]);
    
    if (!$stmt) {
        throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
    }
    
    $sessions = [];
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        // แปลง datetime เป็น string
        if ($row['ActualStartDateTime']) {
            $row['ActualStartDateTime'] = $row['ActualStartDateTime']->format('Y-m-d H:i:s');
        }
        if ($row['ActualEndDateTime']) {
            $row['ActualEndDateTime'] = $row['ActualEndDateTime']->format('Y-m-d H:i:s');
        }
        if ($row['CreatedAt']) {
            $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d H:i:s');
        }
        
        $sessions[] = $row;
    }
    
    return [
        'success' => true,
        'data' => [
            'sessions' => $sessions,
            'totalSessions' => count($sessions)
        ]
    ];
}

/**
 * ดึงสถานะแผนงานสำหรับ partial confirmation
 */
function getPlanStatus($planId) {
    global $conn;
    
    if (!$planId) {
        throw new Exception('Plan ID is required');
    }
    
    // ตรวจสอบว่ามี sessions หรือไม่
    $checkSql = "SELECT COUNT(*) as SessionCount FROM ProductionSessions WHERE PlanID = ?";
    $checkStmt = sqlsrv_query($conn, $checkSql, [$planId]);
    $sessionCount = sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC)['SessionCount'];
    
    // ถ้ามี sessions ให้ดึงข้อมูลความคืบหน้า
    if ($sessionCount > 0) {
        $progress = getProgress($planId);
        
        return [
            'success' => true,
            'data' => [
                'hasPartialConfirmations' => true,
                'totalProduced' => $progress['data']['totalProduced'],
                'remainingQuantity' => $progress['data']['remainingQuantity'],
                'lastSession' => $progress['data']['lastSession'],
                'isCompleted' => $progress['data']['isCompleted']
            ]
        ];
    } else {
        // ไม่มี sessions ดึงแค่ target
        $targetSql = "SELECT TargetOutput FROM ProductionPlans WHERE PlanID = ?";
        $targetStmt = sqlsrv_query($conn, $targetSql, [$planId]);
        
        if (!$targetStmt || !($planData = sqlsrv_fetch_array($targetStmt, SQLSRV_FETCH_ASSOC))) {
            throw new Exception('Plan not found');
        }
        
        $targetOutput = (int)$planData['TargetOutput'];
        
        return [
            'success' => true,
            'data' => [
                'hasPartialConfirmations' => false,
                'totalProduced' => 0,
                'remainingQuantity' => $targetOutput,
                'lastSession' => 0,
                'isCompleted' => false
            ]
        ];
    }
}

/**
 * บันทึก Partial Confirmation (ใช้ตาราง ProductionSessions)
 */
function savePartialConfirmation($data) {
    global $conn;
    
    if (!$data || !isset($data['PlanID']) || intval($data['PlanID']) <= 0) {
        return ['success' => false, 'error' => 'Invalid PlanID'];
    }
    
    try {
        $planId = intval($data['PlanID']);
        
        // ดึงข้อมูลแผนงาน
        $planSql = "SELECT TargetOutput FROM ProductionPlans WHERE PlanID = ?";
        $planStmt = sqlsrv_query($conn, $planSql, [$planId]);
        
        if (!$planStmt || !($plan = sqlsrv_fetch_array($planStmt, SQLSRV_FETCH_ASSOC))) {
            throw new Exception('Plan not found');
        }
        
        $targetOutput = $plan['TargetOutput'];
        
        // หาจำนวน session ล่าสุด
        $sessionSql = "SELECT ISNULL(MAX(SessionNumber), 0) + 1 as NextSession,
                              ISNULL(SUM(SessionQuantity), 0) as TotalProduced
                       FROM ProductionSessions 
                       WHERE PlanID = ?";
        $sessionStmt = sqlsrv_query($conn, $sessionSql, [$planId]);
        $sessionInfo = sqlsrv_fetch_array($sessionStmt, SQLSRV_FETCH_ASSOC);
        
        $nextSession = $sessionInfo['NextSession'];
        $totalProduced = $sessionInfo['TotalProduced'];
        
        // คำนวณข้อมูลสำหรับครั้งนี้
        $sessionQuantity = intval($data['SessionQuantity'] ?? 0);
        $sessionRejectQuantity = intval($data['SessionRejectQuantity'] ?? 0);
        $sessionReworkQuantity = intval($data['SessionReworkQuantity'] ?? 0);
        
        $newTotalProduced = $totalProduced + $sessionQuantity;
        $remainingQuantity = max(0, $targetOutput - $newTotalProduced);
        
        // คำนวณเวลาทำงาน
        $startTime = $data['ActualStartTime'];
        $endTime = $data['ActualEndTime'];
        
        // คำนวณ WorkingMinutes จากเวลาเริ่ม-สิ้นสุด หักเวลาพักและหยุด
        $startDateTime = new DateTime($startTime);
        $endDateTime = new DateTime($endTime);
        $totalMinutes = ($endDateTime->getTimestamp() - $startDateTime->getTimestamp()) / 60;
        
        // Break time
        $breakMorning = intval($data['BreakMorningMinutes'] ?? 0);
        $breakLunch = intval($data['BreakLunchMinutes'] ?? 0);
        $breakEvening = intval($data['BreakEveningMinutes'] ?? 0);
        
        //Downtime
        $downtimeMinutes = intval($data['DowntimeMinutes'] ?? 0);
        $downtimeReason = $data['DowntimeReason'] ?? '';
        
        // Insert ลงตาราง ProductionSessions
        $insertSql = "INSERT INTO ProductionSessions (
            PlanID, SessionNumber, 
            ActualStartDateTime, ActualEndDateTime,
            SessionQuantity, SessionRejectQuantity, SessionReworkQuantity,
            BreakMorningMinutes, BreakLunchMinutes, BreakEveningMinutes,
            DowntimeMinutes, DowntimeReason,
            Remark, CreatedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $insertParams = [
            $planId, $nextSession,
            $startTime, $endTime,
            $sessionQuantity, $sessionRejectQuantity, $sessionReworkQuantity,
            $breakMorning, $breakLunch, $breakEvening,
             $downtimeMinutes, $downtimeReason,
            $data['Remark'] ?? '', 'User'
        ];
        
        $insertStmt = sqlsrv_query($conn, $insertSql, $insertParams);
        
        if (!$insertStmt) {
            throw new Exception('Failed to save session: ' . print_r(sqlsrv_errors(), true));
        }
        
        // ดึงข้อมูลความคืบหน้าใหม่
        $progress = getProgress($planId);
        
        $message = $remainingQuantity <= 0 ? 
            '🎉 เสร็จสิ้นครบเป้าหมายแล้ว!' : 
            "✅ บันทึก Session {$nextSession} สำเร็จ (คงเหลือ {$remainingQuantity} ชิ้น)";
        
        return [
            'success' => true,
            'message' => $message,
            'data' => [
                'sessionNumber' => $nextSession,
                'progress' => $progress['data'] ?? null
            ]
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * ดึงสรุปเวลาจาก partial sessions เพื่อใช้ในการ confirm
 */
function getSessionSummary($planId) {
    global $conn;
    
    if (!$planId) {
        return ['success' => false, 'error' => 'Plan ID is required'];
    }
    
    try {
        $sql = "SELECT 
                    COUNT(*) as TotalSessions,
                    SUM(SessionQuantity) as TotalQuantity,
                    SUM(SessionRejectQuantity) as TotalRejectQuantity,
                    SUM(SessionReworkQuantity) as TotalReworkQuantity,
                    SUM(SessionQuantity - SessionRejectQuantity) as TotalGoodQuantity,
                    
                    -- สรุปเวลา
                    SUM(DATEDIFF(MINUTE, ActualStartDateTime, ActualEndDateTime)) as TotalMinutes,
                    SUM(BreakMorningMinutes) as TotalBreakMorningMinutes,
                    SUM(BreakLunchMinutes) as TotalBreakLunchMinutes,
                    SUM(BreakEveningMinutes) as TotalBreakEveningMinutes,
                    SUM(BreakMorningMinutes + BreakLunchMinutes + BreakEveningMinutes) as TotalBreakMinutes,
                    SUM(DowntimeMinutes) as TotalDowntimeMinutes,
                    
                    -- คำนวณเวลาทำงานจริง
                    SUM(DATEDIFF(MINUTE, ActualStartDateTime, ActualEndDateTime) 
                        - BreakMorningMinutes - BreakLunchMinutes - BreakEveningMinutes 
                        - DowntimeMinutes) as TotalWorkingMinutes,
                    
                    -- เวลาเริ่มต้นและสิ้นสุดรวม
                    MIN(ActualStartDateTime) as OverallStartTime,
                    MAX(ActualEndDateTime) as OverallEndTime
                              
                FROM ProductionSessions 
                WHERE PlanID = ?
                HAVING COUNT(*) > 0";
                
        $stmt = sqlsrv_query($conn, $sql, [$planId]);
        
        if (!$stmt) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $summary = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        if (!$summary || $summary['TotalSessions'] == 0) {
            return [
                'success' => true,
                'data' => [
                    'hasSessions' => false,
                    'message' => 'ไม่พบข้อมูล partial sessions สำหรับแผนงานนี้'
                ]
            ];
        }
        
        // แปลง datetime เป็น string
        if ($summary['OverallStartTime']) {
            $summary['OverallStartTime'] = $summary['OverallStartTime']->format('Y-m-d H:i:s');
        }
        if ($summary['OverallEndTime']) {
            $summary['OverallEndTime'] = $summary['OverallEndTime']->format('Y-m-d H:i:s');
        }
        
        // คำนวณข้อมูลเพิ่มเติม
        $totalMinutes = $summary['TotalMinutes'] ?? 0;
        $totalWorkingMinutes = $summary['TotalWorkingMinutes'] ?? 0;
        $totalQuantity = $summary['TotalQuantity'] ?? 0;
        
        // คำนวณ Run Rate
        $actualRunRate = ($totalWorkingMinutes > 0) ? ($totalQuantity / $totalWorkingMinutes) : 0;
        
        return [
            'success' => true,
            'data' => [
                'hasSessions' => true,
                'summary' => $summary,
                'calculated' => [
                    'ActualRunRate' => round($actualRunRate, 2),
                    'TotalHours' => round($totalMinutes / 60, 2),
                    'WorkingHours' => round($totalWorkingMinutes / 60, 2)
                ],
                'forConfirmForm' => [
                    'TotalPieces' => $totalQuantity,
                    'RejectPieces' => $summary['TotalRejectQuantity'] ?? 0,
                    'ReworkPieces' => $summary['TotalReworkQuantity'] ?? 0,
                    'BreakMorningMinutes' => $summary['TotalBreakMorningMinutes'] ?? 0,
                    'BreakLunchMinutes' => $summary['TotalBreakLunchMinutes'] ?? 0,
                    'BreakEveningMinutes' => $summary['TotalBreakEveningMinutes'] ?? 0,
                    'DowntimeMinutes' => $summary['TotalDowntimeMinutes'] ?? 0,
                    'ActualStartTime' => $summary['OverallStartTime'],
                    'ActualEndTime' => $summary['OverallEndTime'],
                    'ActiveWorkMinutes' => $totalWorkingMinutes,
                    'ActualRunRate' => round($actualRunRate, 2)
                ]
            ]
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}
?>
