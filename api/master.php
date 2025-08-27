<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
require_once __DIR__ . '/../db.php';

// Check connection
if (!$conn) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// ===== UTILITY FUNCTIONS =====

function sendResponse($data, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function sendError($message, $httpCode = 400) {
    sendResponse([
        'success' => false,
        'message' => $message
    ], $httpCode);
}

// ===== DEPARTMENTS FUNCTIONS =====

function getDepartments($conn, $includeInactive = false, $withMachines = false) {
    try {
        if ($withMachines) {
            $query = "SELECT 
                d.DepartmentID,
                d.DepartmentName,
                d.IsActive,
                d.CreatedAt,
                d.UpdatedAt,
                COUNT(m.MachineID) as TotalMachines,
                SUM(CASE WHEN m.IsActive = 1 THEN 1 ELSE 0 END) as ActiveMachines
            FROM Departments d
            LEFT JOIN Machines m ON d.DepartmentID = m.DepartmentID";
            
            if (!$includeInactive) {
                $query .= " WHERE d.IsActive = 1";
            }
            
            $query .= " GROUP BY d.DepartmentID, d.DepartmentName, d.IsActive, d.CreatedAt, d.UpdatedAt
                       ORDER BY d.DepartmentName ASC";
        } else {
            $query = "SELECT 
                DepartmentID,
                DepartmentName,
                IsActive,
                CreatedAt,
                UpdatedAt
            FROM Departments";
            
            if (!$includeInactive) {
                $query .= " WHERE IsActive = 1";
            }
            
            $query .= " ORDER BY DepartmentName ASC";
        }
        
        $stmt = sqlsrv_query($conn, $query);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $departments = array();
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $department = array(
                'DepartmentID' => (int)$row['DepartmentID'],
                'DepartmentName' => $row['DepartmentName'],
                'IsActive' => (bool)$row['IsActive'],
                'CreatedAt' => formatDateTime($row['CreatedAt']),
                'UpdatedAt' => formatDateTime($row['UpdatedAt'])
            );
            
            if ($withMachines) {
                $department['TotalMachines'] = (int)$row['TotalMachines'];
                $department['ActiveMachines'] = (int)$row['ActiveMachines'];
            }
            
            $departments[] = $department;
        }
        
        sqlsrv_free_stmt($stmt);
        
        return array(
            'success' => true,
            'data' => $departments,
            'count' => count($departments)
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching departments: ' . $e->getMessage()
        );
    }
}

function getDepartment($conn, $departmentId) {
    try {
        $query = "SELECT 
            DepartmentID,
            DepartmentName,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM Departments 
        WHERE DepartmentID = ? AND IsActive = 1";
        
        $stmt = sqlsrv_query($conn, $query, [$departmentId]);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $department = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        if ($department) {
            return array(
                'success' => true,
                'data' => array(
                    'DepartmentID' => (int)$department['DepartmentID'],
                    'DepartmentName' => $department['DepartmentName'],
                    'IsActive' => (bool)$department['IsActive'],
                    'CreatedAt' => formatDateTime($department['CreatedAt']),
                    'UpdatedAt' => formatDateTime($department['UpdatedAt'])
                )
            );
        } else {
            return array(
                'success' => false,
                'message' => 'Department not found'
            );
        }
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching department: ' . $e->getMessage()
        );
    }
}

// ===== SUB-DEPARTMENTS FUNCTIONS =====

function getSubDepartments($conn, $departmentId = null) {
    try {
        $query = "SELECT 
            sd.SubDepartmentID,
            sd.SubDepartmentName,
            sd.DepartmentID,
            sd.IsActive,
            sd.CreatedAt,
            sd.UpdatedAt,
            d.DepartmentName
        FROM SubDepartments sd
        LEFT JOIN Departments d ON sd.DepartmentID = d.DepartmentID
        WHERE sd.IsActive = 1";
        
        $params = [];
        if ($departmentId !== null) {
            $query .= " AND sd.DepartmentID = ?";
            $params[] = $departmentId;
        }
        
        $query .= " ORDER BY d.DepartmentName, sd.SubDepartmentName ASC";
        
        $stmt = sqlsrv_query($conn, $query, $params);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $subDepartments = array();
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $subDepartments[] = array(
                'SubDepartmentID' => (int)$row['SubDepartmentID'],
                'SubDepartmentName' => $row['SubDepartmentName'],
                'DepartmentID' => (int)$row['DepartmentID'],
                'DepartmentName' => $row['DepartmentName'],
                'IsActive' => (bool)$row['IsActive'],
                'CreatedAt' => formatDateTime($row['CreatedAt']),
                'UpdatedAt' => formatDateTime($row['UpdatedAt'])
            );
        }
        
        return array(
            'success' => true,
            'data' => $subDepartments,
            'count' => count($subDepartments)
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching sub-departments: ' . $e->getMessage()
        );
    }
}

// ===== MACHINES FUNCTIONS =====

function getMachines($conn, $departmentId = null, $subDepartmentId = null) {
    try {
        $query = "SELECT 
            m.MachineID,
            m.MachineName,
            m.DepartmentID,
            m.DefaultIdealRunRate,
            m.IsActive,
            m.CreatedAt,
            m.UpdatedAt,
            d.DepartmentName
        FROM Machines m
        LEFT JOIN Departments d ON m.DepartmentID = d.DepartmentID
        WHERE m.IsActive = 1";
        
        $params = [];
        
        // Only filter by department since SubDepartmentID doesn't exist in Machines table
        if ($departmentId !== null) {
            $query .= " AND m.DepartmentID = ?";
            $params[] = $departmentId;
        }
        
        $query .= " ORDER BY d.DepartmentName, m.MachineName ASC";
        
        $stmt = sqlsrv_query($conn, $query, $params);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $machines = array();
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $machines[] = array(
                'MachineID' => (int)$row['MachineID'],
                'MachineName' => $row['MachineName'],
                'DepartmentID' => (int)$row['DepartmentID'],
                'DepartmentName' => $row['DepartmentName'],
                'DefaultIdealRunRate' => floatval($row['DefaultIdealRunRate'] ?? 0),
                'IsActive' => (bool)$row['IsActive'],
                'CreatedAt' => formatDateTime($row['CreatedAt']),
                'UpdatedAt' => formatDateTime($row['UpdatedAt'])
            );
        }
        
        return array(
            'success' => true,
            'data' => $machines,
            'count' => count($machines)
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching machines: ' . $e->getMessage()
        );
    }
}

// ===== PRODUCTS FUNCTIONS =====

function getProducts($conn, $searchQuery = null) {
    try {
        $query = "SELECT 
            ProductID,
            ProductCode,
            ProductName,
            Description,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM Products 
        WHERE IsActive = 1";
        
        $params = [];
        if ($searchQuery) {
            $query .= " AND (ProductName LIKE ? OR ProductCode LIKE ? OR Description LIKE ?)";
            $searchTerm = '%' . $searchQuery . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $query .= " ORDER BY ProductName ASC";
        
        $stmt = sqlsrv_query($conn, $query, $params);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $products = array();
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $products[] = array(
                'ProductID' => (int)$row['ProductID'],
                'ProductCode' => $row['ProductCode'],
                'ProductName' => $row['ProductName'],
                'Description' => $row['Description'],
                'IsActive' => (bool)$row['IsActive'],
                'CreatedAt' => formatDateTime($row['CreatedAt']),
                'UpdatedAt' => formatDateTime($row['UpdatedAt'])
            );
        }
        
        return array(
            'success' => true,
            'data' => $products,
            'count' => count($products)
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching products: ' . $e->getMessage()
        );
    }
}

// ===== PRODUCT SIZES FUNCTIONS =====

function getProductSizes($conn, $productName = null) {
    try {
        $query = "SELECT 
            SizeID,
            SizeValue,
            SizeUnit,
            SizeDisplay,
            sort_order,
            IsActive,
            CreatedAt
        FROM ProductSizes 
        WHERE IsActive = 1";
        
        $params = [];
        
        // Note: productName filtering is not applicable for ProductSizes table
        // as it contains all available sizes, not product-specific sizes
        
        $query .= " ORDER BY sort_order ASC, SizeDisplay ASC";
        
        $stmt = sqlsrv_query($conn, $query, $params);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $sizes = array();
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $sizes[] = array(
                'SizeID' => (int)$row['SizeID'],
                'SizeValue' => $row['SizeValue'],
                'SizeUnit' => $row['SizeUnit'],
                'SizeDisplay' => $row['SizeDisplay'],
                'sort_order' => (int)$row['sort_order'],
                'IsActive' => (bool)$row['IsActive'],
                'CreatedAt' => formatDateTime($row['CreatedAt'])
            );
        }
        
        return array(
            'success' => true,
            'data' => $sizes,
            'count' => count($sizes)
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching product sizes: ' . $e->getMessage()
        );
    }
}

// ===== COMBINED FUNCTIONS =====

function getAllMasterData($conn) {
    $departments = getDepartments($conn, false, true);
    $subDepartments = getSubDepartments($conn);
    $machines = getMachines($conn);
    $products = getProducts($conn);
    $sizes = getProductSizes($conn);
    
    return array(
        'success' => true,
        'data' => array(
            'departments' => $departments['success'] ? $departments['data'] : [],
            'subDepartments' => $subDepartments['success'] ? $subDepartments['data'] : [],
            'machines' => $machines['success'] ? $machines['data'] : [],
            'products' => $products['success'] ? $products['data'] : [],
            'productSizes' => $sizes['success'] ? $sizes['data'] : [],
        ),
        'counts' => array(
            'departments' => $departments['success'] ? $departments['count'] : 0,
            'subDepartments' => $subDepartments['success'] ? $subDepartments['count'] : 0,
            'machines' => $machines['success'] ? $machines['count'] : 0,
            'products' => $products['success'] ? $products['count'] : 0,
            'productSizes' => $sizes['success'] ? $sizes['count'] : 0,
        ),
        'lastUpdated' => date('Y-m-d H:i:s')
    );
}

// ===== MAIN API LOGIC =====

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    // GET requests
    if ($method === 'GET') {
        switch ($action) {
            case 'get_departments':
                $includeInactive = isset($_GET['include_inactive']) && $_GET['include_inactive'] === '1';
                $withMachines = isset($_GET['with_machines']) && $_GET['with_machines'] === '1';
                $result = getDepartments($conn, $includeInactive, $withMachines);
                break;
                
            case 'get_department':
                if (!isset($_GET['id'])) {
                    sendError('Department ID is required');
                }
                $result = getDepartment($conn, intval($_GET['id']));
                break;
                
            case 'get_sub_departments':
                $departmentId = isset($_GET['department']) ? intval($_GET['department']) : null;
                $result = getSubDepartments($conn, $departmentId);
                break;
                
            case 'get_machines':
                $departmentId = isset($_GET['department']) ? intval($_GET['department']) : null;
                $subDepartmentId = isset($_GET['subDepartment']) ? intval($_GET['subDepartment']) : null;
                $result = getMachines($conn, $departmentId, $subDepartmentId);
                break;
                
            case 'get_products':
                $searchQuery = $_GET['q'] ?? null;
                $result = getProducts($conn, $searchQuery);
                break;
                
            case 'get_product_sizes':
                $productName = $_GET['product'] ?? null;
                $result = getProductSizes($conn, $productName);
                break;
                
            case 'get_all_master_data':
                $result = getAllMasterData($conn);
                break;
                
            // Legacy support
            case 'departments':
                $result = getDepartments($conn, false, true);
                break;
                
            case 'machines':
                $departmentId = isset($_GET['department']) ? intval($_GET['department']) : null;
                $result = getMachines($conn, $departmentId);
                break;
                
            default:
                sendError('Unknown action: ' . $action);
        }
    } else {
        sendError('Only GET method is supported for master data', 405);
    }
    
    // Send response
    if ($result['success']) {
        sendResponse($result);
    } else {
        sendError($result['message']);
    }
    
} catch (Exception $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}
?>