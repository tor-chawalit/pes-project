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

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';

// ตรวจสอบการเชื่อมต่อฐานข้อมูลอย่างละเอียด
if (!$conn) {
    $sqlsrvErrors = sqlsrv_errors();
    $errorDetails = [];
    
    if ($sqlsrvErrors) {
        foreach ($sqlsrvErrors as $error) {
            $errorDetails[] = [
                'SQLSTATE' => $error['SQLSTATE'] ?? 'Unknown',
                'Code' => $error['code'] ?? 'Unknown', 
                'Message' => $error['message'] ?? 'Unknown error'
            ];
        }
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Database connection failed',
        'details' => 'Unable to connect to SQL Server database',
        'sqlsrv_errors' => $errorDetails,
        'server_info' => [
            'php_version' => phpversion(),
            'sqlsrv_extension' => extension_loaded('sqlsrv') ? 'loaded' : 'not loaded',
            'pdo_sqlsrv_extension' => extension_loaded('pdo_sqlsrv') ? 'loaded' : 'not loaded'
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

$action = $_GET['action'] ?? '';

// Debug mode - แสดงข้อมูล Request และ System Info
if (isset($_GET['debug'])) {
    echo json_encode([
        'debug' => true,
        'action' => $action,
        'get_params' => $_GET,
        'server_name' => $_SERVER['SERVER_NAME'],
        'script_name' => $_SERVER['SCRIPT_NAME'],
        'database_connected' => $conn ? 'yes' : 'no',
        'system_info' => [
            'php_version' => phpversion(),
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
            'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'Unknown'
        ],
        'extensions_status' => [
            'sqlsrv' => extension_loaded('sqlsrv') ? 'loaded' : 'not loaded',
            'pdo_sqlsrv' => extension_loaded('pdo_sqlsrv') ? 'loaded' : 'not loaded',
            'json' => extension_loaded('json') ? 'loaded' : 'not loaded'
        ],
        'database_functions' => [
            'sqlsrv_connect' => function_exists('sqlsrv_connect') ? 'available' : 'not available',
            'sqlsrv_query' => function_exists('sqlsrv_query') ? 'available' : 'not available',
            'sqlsrv_errors' => function_exists('sqlsrv_errors') ? 'available' : 'not available'
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/**
 * บันทึก Partial Confirmation
 */
if ($action === 'save_partial_confirmation') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Log received data for debugging
    error_log('Received save_partial_confirmation data: ' . print_r($data, true));
    
    if (!$data || !isset($data['PlanID']) || intval($data['PlanID']) <= 0) {
        error_log('Invalid PlanID in save_partial_confirmation');
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid PlanID'], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
    
    try {
        $planId = intval($data['PlanID']);
        error_log("Processing save_partial_confirmation for PlanID: $planId");
        
        // ดึงข้อมูลแผนงาน
        $planSql = "SELECT TargetOutput FROM ProductionPlans WHERE PlanID = ?";
        $planStmt = sqlsrv_query($conn, $planSql, [$planId]);
        
        if (!$planStmt) {
            $errors = sqlsrv_errors();
            error_log('Plan query failed: ' . print_r($errors, true));
            throw new Exception('Plan query failed: ' . print_r($errors, true));
        }
        
        $plan = sqlsrv_fetch_array($planStmt, SQLSRV_FETCH_ASSOC);
        if (!$plan) {
            error_log("Plan not found for PlanID: $planId");
            throw new Exception('Plan not found');
        }
        
        $targetOutput = $plan['TargetOutput'];
        
        // หาจำนวนการยืนยันที่ผ่านมา
        $sessionSql = "SELECT COUNT(*) + 1 as NextSession,
                              ISNULL(SUM(SessionQuantity), 0) as TotalProduced
                       FROM ProductionSessions 
                       WHERE PlanID = ?";
        $sessionStmt = sqlsrv_query($conn, $sessionSql, [$planId]);
        
        if (!$sessionStmt) {
            $errors = sqlsrv_errors();
            error_log('Session query failed: ' . print_r($errors, true));
            throw new Exception('Session query failed: ' . print_r($errors, true));
        }
        
        $sessionInfo = sqlsrv_fetch_array($sessionStmt, SQLSRV_FETCH_ASSOC);
        
        $nextSession = $sessionInfo['NextSession'];
        $totalProduced = $sessionInfo['TotalProduced'];
        
        $nextSession = $sessionInfo['NextSession'];
        $totalProduced = $sessionInfo['TotalProduced'];
        
        // คำนวณข้อมูลสำหรับครั้งนี้
        $sessionQuantity = intval($data['SessionQuantity'] ?? 0);
        $sessionRejectQuantity = intval($data['SessionRejectQuantity'] ?? 0);
        $sessionGoodQuantity = $sessionQuantity - $sessionRejectQuantity;
        
        $newTotalProduced = $totalProduced + $sessionQuantity;
        $remainingQuantity = max(0, $targetOutput - $newTotalProduced);
        
        // เตรียม SQL สำหรับ Insert (ตามโครงสร้างตาราง ProductionSessions)
        $insertSql = "INSERT INTO ProductionSessions (
            PlanID, SessionNumber, ActualStartDateTime, ActualEndDateTime,
            SessionQuantity, SessionRejectQuantity, SessionReworkQuantity,
            BreakMorningMinutes, BreakLunchMinutes, BreakEveningMinutes,
            DowntimeMinutes, DowntimeReason ,
            WorkingMinutes, Remark, CreatedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $currentDateTime = date('Y-m-d H:i:s');
        $startTime = $data['ActualStartTime'] ?? $currentDateTime;
        $endTime = $data['ActualEndTime'] ?? $currentDateTime;
        
        // คำนวณเวลาทำงานสุทธิ (หัก Break และ Downtime)
        $breakMinutes = intval($data['BreakMorningMinutes'] ?? 0) + 
                       intval($data['BreakLunchMinutes'] ?? 0) + 
                       intval($data['BreakEveningMinutes'] ?? 0);
        $downtimeMinutes = intval($data['DowntimeMinutes'] ?? 0);
        
        $startDateTime = new DateTime($startTime);
        $endDateTime = new DateTime($endTime);
        $totalMinutes = ($endDateTime->getTimestamp() - $startDateTime->getTimestamp()) / 60;
        $workingMinutes = max(0, $totalMinutes - $breakMinutes - $downtimeMinutes);
        
        $insertParams = [
            $planId, 
            $nextSession,
            $startTime,
            $endTime,
            $sessionQuantity, 
            $sessionRejectQuantity,
            intval($data['SessionReworkQuantity'] ?? 0),
            intval($data['BreakMorningMinutes'] ?? 0),
            intval($data['BreakLunchMinutes'] ?? 0),
            intval($data['BreakEveningMinutes'] ?? 0),
            intval($data['DowntimeMinutes'] ?? 0),
            $data['DowntimeReason'] ?? null,
            $workingMinutes, // เพิ่มเวลาทำงานสุทธิ
            $data['Remark'] ?? null,
            $data['ConfirmedByUserName'] ?? 'System'
        ];
        
        $insertStmt = sqlsrv_query($conn, $insertSql, $insertParams);
        
        if (!$insertStmt) {
            throw new Exception('Failed to insert session: ' . print_r(sqlsrv_errors(), true));
        }
        
        // ถ้า remaining = 0 ให้อัปเดตสถานะแผนงานเป็น completed
        if ($remainingQuantity <= 0) {
            $updatePlanSql = "UPDATE ProductionPlans SET Status = 'completed' WHERE PlanID = ?";
            sqlsrv_query($conn, $updatePlanSql, [$planId]);
            
            // สร้าง ProductionResult สุดท้าย (รวมข้อมูลทั้งหมด)
            createFinalProductionResult($conn, $planId, $data);
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'sessionNumber' => $nextSession,
                'confirmedQuantity' => $sessionQuantity,
                'rejectQuantity' => $sessionRejectQuantity,
                'goodQuantity' => $sessionGoodQuantity,
                'cumulativeQuantity' => $newTotalProduced,
                'remainingQuantity' => $remainingQuantity,
                'isComplete' => $remainingQuantity <= 0,
                'status' => $remainingQuantity <= 0 ? 'COMPLETED' : 'CONFIRMED'
            ],
            'message' => $remainingQuantity <= 0 ? 
                'งานเสร็จสิ้นครบถ้วนแล้ว!' : 
                "บันทึกเสร็จแล้ว คงเหลือ {$remainingQuantity} ชิ้น"
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to save session',
            'details' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
    exit;
}

/**
 * สร้าง ProductionResult สุดท้าย (เมื่อ remaining = 0)
 */
function createFinalProductionResult($conn, $planId, $latestData) {
    try {
        // รวมข้อมูลจาก production sessions ทั้งหมด
        $summarySql = "SELECT 
                           COUNT(*) as TotalSessions,
                           SUM(SessionQuantity) as TotalQuantity,
                           SUM(SessionRejectQuantity) as TotalRejects,
                           SUM(SessionReworkQuantity) as TotalRework,
                           MIN(ActualStartDateTime) as OverallStartTime,
                           MAX(ActualEndDateTime) as OverallEndTime,
                           SUM(BreakMorningMinutes + BreakLunchMinutes + BreakEveningMinutes) as TotalBreaks,
                           SUM(DowntimeMinutes) as TotalDowntime
                       FROM ProductionSessions 
                       WHERE PlanID = ?";
        
        $summaryStmt = sqlsrv_query($conn, $summarySql, [$planId]);
        $summary = sqlsrv_fetch_array($summaryStmt, SQLSRV_FETCH_ASSOC);
        
        // ดึงข้อมูลแผนงาน
        $planSql = "SELECT * FROM ProductionPlans WHERE PlanID = ?";
        $planStmt = sqlsrv_query($conn, $planSql, [$planId]);
        $plan = sqlsrv_fetch_array($planStmt, SQLSRV_FETCH_ASSOC);
        
        // สร้าง ProductionResult
        // (ใช้โค้ดจาก results.php แต่ดัดแปลงให้ใช้ข้อมูลรวม)
        require_once 'results.php';
        
        // จัดเตรียมข้อมูลสำหรับ ProductionResult
        $finalData = [
            'PlanID' => $planId,
            'TotalPieces' => $summary['TotalQuantity'],
            'RejectPieces' => $summary['TotalRejects'],
            'ActualStartTime' => $summary['OverallStartTime']->format('Y-m-d H:i:s'),
            'ActualEndTime' => $summary['OverallEndTime']->format('Y-m-d H:i:s'),
            'ActiveWorkMinutes' => $summary['TotalWorkingMinutes'],
            'BreakMorningMinutes' => intval($latestData['BreakMorningMinutes'] ?? 0),
            'BreakLunchMinutes' => intval($latestData['BreakLunchMinutes'] ?? 0),
            'BreakEveningMinutes' => intval($latestData['BreakEveningMinutes'] ?? 0),
            'DowntimeMinutes' => $summary['TotalDowntime'],
            'StandardRunRate' => floatval($latestData['StandardRunRate'] ?? 1.0),
            'ConfirmedByUserName' => $latestData['ConfirmedByUserName'] ?? 'System'
        ];
        
        // เรียกใช้ logic การบันทึก ProductionResult
        // (โค้ดนี้จะต้องแยก logic ออกมาเป็นฟังก์ชันใน results.php)
        
    } catch (Exception $e) {
        error_log('Error in createFinalProductionResult: ' . $e->getMessage());
        return false;
    }
}

/**
 * ดึงข้อมูล Partial Confirmations ทั้งหมดของแผนงาน
 */
if ($action === 'get_partial_confirmations') {
    $planId = intval($_GET['plan_id'] ?? 0);
    
    if ($planId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid PlanID'], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
    
    try {
        // ตรวจสอบว่าตาราง ProductionSessions มีอยู่หรือไม่
        $checkTableSql = "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ProductionSessions'";
        $checkStmt = sqlsrv_query($conn, $checkTableSql);
        
        if ($checkStmt === false || !sqlsrv_fetch_array($checkStmt)) {
            // ถ้าไม่มีตาราง ส่งข้อมูลว่าง
            echo json_encode([
                'success' => true,
                'data' => [
                    'confirmations' => [],
                    'summary' => null
                ]
            ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
            exit;
        }
        
        $sql = "SELECT 
                    SessionID, PlanID, SessionNumber, SessionQuantity, 
                    SessionRejectQuantity, SessionReworkQuantity,
                    ActualStartDateTime, ActualEndDateTime,
                    BreakMorningMinutes, BreakLunchMinutes, BreakEveningMinutes,
                  DowntimeMinutes, DowntimeReason, Remark,
                    CreatedBy, CreatedAt
                FROM ProductionSessions 
                WHERE PlanID = ?
                ORDER BY SessionNumber";
        
        $stmt = sqlsrv_query($conn, $sql, [$planId]);
        
        if (!$stmt) {
            $errors = sqlsrv_errors();
            throw new Exception('Database query failed: ' . print_r($errors, true));
        }
        
        $confirmations = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            // แปลง DateTime objects เป็น string
            if ($row['ActualStartDateTime'] && is_object($row['ActualStartDateTime'])) {
                $row['ActualStartDateTime'] = $row['ActualStartDateTime']->format('Y-m-d H:i:s');
            }
            if ($row['ActualEndDateTime'] && is_object($row['ActualEndDateTime'])) {
                $row['ActualEndDateTime'] = $row['ActualEndDateTime']->format('Y-m-d H:i:s');
            }
            if ($row['CreatedAt'] && is_object($row['CreatedAt'])) {
                $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d H:i:s');
            }
            
            // คำนวณค่าเพิ่มเติม
            $row['SessionGoodQuantity'] = $row['SessionQuantity'] - $row['SessionRejectQuantity']; // ไม่ลบ Rework
            $row['TotalBreakMinutes'] = $row['BreakMorningMinutes'] + $row['BreakLunchMinutes'] + $row['BreakEveningMinutes'];
            
            // คำนวณเวลาทำงานสุทธิ (หัก Break และ Downtime แล้ว)
            if ($row['ActualStartDateTime'] && $row['ActualEndDateTime']) {
                $startTime = new DateTime($row['ActualStartDateTime']);
                $endTime = new DateTime($row['ActualEndDateTime']);
                $totalMinutes = ($endTime->getTimestamp() - $startTime->getTimestamp()) / 60;
                $row['WorkingMinutes'] = max(0, $totalMinutes - $row['TotalBreakMinutes'] - $row['DowntimeMinutes']);
            } else {
                $row['WorkingMinutes'] = 0;
            }
            
            $confirmations[] = $row;
        }
        
        // ดึงข้อมูลสรุป (ถ้าตารางมีอยู่)
        $summary = null;
        try {
            $summarySql = "SELECT COUNT(*) as TotalSessions FROM ProductionSessions WHERE PlanID = ?";
            $summaryStmt = sqlsrv_query($conn, $summarySql, [$planId]);
            if ($summaryStmt) {
                $summary = sqlsrv_fetch_array($summaryStmt, SQLSRV_FETCH_ASSOC);
            }
        } catch (Exception $summaryError) {
            // ถ้า query สรุปไม่ได้ ให้ส่ง null
            $summary = null;
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'confirmations' => $confirmations,
                'summary' => $summary
            ]
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to retrieve sessions',
            'details' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
    exit;
}

/**
 * ดึงข้อมูลสถานะปัจจุบันของแผนงาน
 */
if ($action === 'get_plan_status') {
    $planId = intval($_GET['plan_id'] ?? 0);
    
    if ($planId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid PlanID'], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
    
    try {
        // ดึงข้อมูลแผนงาน
        $planSql = "SELECT PlanID, TargetOutput, Status FROM ProductionPlans WHERE PlanID = ?";
        $planStmt = sqlsrv_query($conn, $planSql, [$planId]);
        
        if ($planStmt === false) {
            $errors = sqlsrv_errors();
            throw new Exception('Plan query failed: ' . print_r($errors, true));
        }
        
        $plan = sqlsrv_fetch_array($planStmt, SQLSRV_FETCH_ASSOC);
        
        if (!$plan) {
            throw new Exception('Plan not found with ID: ' . $planId);
        }
        
        // ตรวจสอบว่าตาราง ProductionSessions มีอยู่หรือไม่
        $checkTableSql = "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ProductionSessions'";
        $checkStmt = sqlsrv_query($conn, $checkTableSql);
        
        if ($checkStmt === false || !sqlsrv_fetch_array($checkStmt)) {
            // ถ้าไม่มีตาราง ใช้ข้อมูลจากแผนงานเท่านั้น
            $targetOutput = $plan['TargetOutput'];
            echo json_encode([
                'success' => true,
                'data' => [
                    'planId' => $plan['PlanID'],
                    'targetOutput' => $targetOutput,
                    'totalProduced' => 0,
                    'remainingQuantity' => $targetOutput,
                    'lastSession' => 0,
                    'planStatus' => $plan['Status'],
                    'isCompleted' => $plan['Status'] === 'completed',
                    'hasPartialConfirmations' => false
                ]
            ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
            exit;
        }
        
        // ดึงข้อมูลสรุป production sessions
        $summarySql = "SELECT 
                           ISNULL(SUM(SessionQuantity), 0) as TotalProduced,
                           ISNULL(MAX(SessionNumber), 0) as LastSession
                       FROM ProductionSessions 
                       WHERE PlanID = ?";
        $summaryStmt = sqlsrv_query($conn, $summarySql, [$planId]);
        
        if ($summaryStmt === false) {
            $errors = sqlsrv_errors();
            throw new Exception('Summary query failed: ' . print_r($errors, true));
        }
        
        $summary = sqlsrv_fetch_array($summaryStmt, SQLSRV_FETCH_ASSOC);
        
        $targetOutput = $plan['TargetOutput'];
        $totalProduced = $summary['TotalProduced'] ?: 0;
        $remainingQuantity = max(0, $targetOutput - $totalProduced);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'planId' => $plan['PlanID'],
                'targetOutput' => $targetOutput,
                'totalProduced' => $totalProduced,
                'remainingQuantity' => $remainingQuantity,
                'lastSession' => $summary['LastSession'] ?: 0,
                'planStatus' => $plan['Status'],
                'isCompleted' => $remainingQuantity <= 0 || $plan['Status'] === 'completed',
                'hasPartialConfirmations' => $summary['LastSession'] > 0
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to get plan status',
            'details' => $e->getMessage()
        ]);
    }
    exit;
}

// Invalid action
http_response_code(400);
echo json_encode([
    'success' => false,
    'error' => 'Invalid action or missing parameters'
]);