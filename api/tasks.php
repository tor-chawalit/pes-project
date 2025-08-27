<?php
// ต้องอยู่บนสุด ห้ามมีช่องว่าง/BOM ก่อนหน้า
ob_start();
header_remove();
header('Content-Type: application/json; charset=utf-8');

// Error handling setup
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-error.log');

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
    throw new ErrorException($message, 0, $severity, $file, $line);
});

include 'db.php';
include 'api/utils.php';
    require_once 'api/plans.php';



// ตรวจสอบการเชื่อมต่อฐานข้อมูล
if ($conn === false) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed', 'details' => sqlsrv_errors()], JSON_UNESCAPED_UNICODE);
    exit;
}

// ดึง action จาก GET หรือ POST
$action = '';
if (isset($_GET['action'])) {
    $action = $_GET['action'];
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $queryString = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
    if ($queryString) {
        parse_str($queryString, $params);
        if (isset($params['action'])) {
            $action = $params['action'];
        }
    }
}

if (in_array($action, [
    'get_departments', 'get_department', 'get_sub_departments', 'get_machines', 
    'get_products', 'get_product_sizes', 'get_all_master_data',
    'departments', 'machines' // Legacy support
])) {
    include 'api/master.php';
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'No action specified']);
?>