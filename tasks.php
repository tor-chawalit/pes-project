<?php
/**
 * Main API Router for Production Planning System
 * Routes requests to appropriate API modules based on action parameter
 */

// Start output buffering to capture any unwanted output
ob_start();

// Register shutdown function to handle errors and clean output
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_RECOVERABLE_ERROR])) {
        // Clear any buffered output
        if (ob_get_level()) {
            ob_clean();
        }
        
        // Send error response
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => 'PHP Fatal Error: ' . $error['message'],
            'file' => $error['file'],
            'line' => $error['line']
        ]);
    } else {
        // Normal execution - flush the buffer
        if (ob_get_level()) {
            ob_end_flush();
        }
    }
});

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration and utilities
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/api/utils.php';


// Get the action parameter
$action = $_GET['action'] ?? $_POST['action'] ?? null;

if (!$action) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Action parameter is required'
    ]);
    exit();
}

try {
    // Route requests to appropriate API modules
    switch ($action) {
        // Production Plans API
        case 'get_plans':
        case 'add_plan':
        case 'create_plan_header':
        case 'assign_plan_resources':
        case 'update_plan':
        case 'delete_plan':
        case 'confirm_plan':
        case 'get_plan_detail':  // เพิ่มสำหรับ confirm-complete page
            require_once 'api/plans.php';
            break;
            
        // Production Results API
        case 'get_results':
        case 'add_result':
        case 'update_result':
        case 'delete_result':
        case 'save_production_result':  // เพิ่มสำหรับ confirm-complete page
        case 'get_production_results':
        case 'get_completed_plans':
            require_once 'api/results.php';
            break;
            
        // Master Data API
        case 'get_departments':
        case 'get_sub_departments':
        case 'get_machines':
        case 'get_products':
        case 'get_product_sizes':
            require_once 'api/master.php';
            break;
            
        // Dashboard API
        case 'dashboard':
        case 'dashboard_data':
        case 'summary':
        case 'oee_data':
        case 'downtime_data':
            require_once 'api/dashboard.php';
            break;
            
        default:
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Unknown action: ' . $action
            ]);
            exit();
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}
?>
