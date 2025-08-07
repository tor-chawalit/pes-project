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

// Database configuration - SQL Server
require_once '../db.php';

// Check connection
if (!$conn) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit();
}

/**
 * ดึงรายการขนาดทั้งหมดที่ยังใช้งานอยู่
 */
function getProductSizes($conn, $productId = null) {
    try {
        // ดึงขนาดทั้งหมด (ไม่แยกตาม Product เพราะไม่มี ProductID ในตาราง)
        $query = "SELECT 
            SizeID,
            SizeValue,
            SizeUnit,
            SizeDisplay,
            sort_order,
            IsActive,
            CreatedAt
        FROM ProductSizes 
        WHERE IsActive = 1 
        ORDER BY sort_order ASC, SizeValue ASC";
        
        $stmt = sqlsrv_query($conn, $query);
        
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
                'SortOrder' => (int)$row['sort_order'],
                'IsActive' => (bool)$row['IsActive'],
                'CreatedAt' => $row['CreatedAt'] ? $row['CreatedAt']->format('Y-m-d H:i:s') : null
            );
        }
        
        sqlsrv_free_stmt($stmt);
        
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

/**
 * ดึงข้อมูลขนาดเฉพาะตัว
 */
function getProductSize($conn, $sizeId) {
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
        WHERE SizeID = ? AND IsActive = 1";
        
        $params = array($sizeId);
        $stmt = sqlsrv_query($conn, $query, $params);
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $size = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        if ($size) {
            sqlsrv_free_stmt($stmt);
            return array(
                'success' => true,
                'data' => array(
                    'sizeId' => (int)$size['SizeID'],
                    'sizeValue' => $size['SizeValue'],
                    'sizeUnit' => $size['SizeUnit'],
                    'sizeDisplay' => $size['SizeDisplay'],
                    'sortOrder' => (int)$size['sort_order'],
                    'isActive' => (bool)$size['IsActive'],
                    'createdAt' => $size['CreatedAt'] ? $size['CreatedAt']->format('Y-m-d H:i:s') : null
                )
            );
        } else {
            sqlsrv_free_stmt($stmt);
            return array(
                'success' => false,
                'message' => 'Product size not found'
            );
        }
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching product size: ' . $e->getMessage()
        );
    }
}

/**
 * เพิ่มขนาดใหม่
 */
function createProductSize($conn, $data) {
    try {
        $query = "INSERT INTO ProductSizes (SizeValue, SizeUnit, SizeDisplay, sort_order, IsActive, CreatedAt) 
                  VALUES (?, ?, ?, ?, ?, GETDATE())";
        
        $params = array(
            $data['sizeValue'],
            $data['sizeUnit'],
            $data['sizeDisplay'],
            isset($data['sortOrder']) ? $data['sortOrder'] : 0,
            $data['isActive'] ? 1 : 0
        );
        
        $stmt = sqlsrv_query($conn, $query, $params);
        if ($stmt === false) {
            throw new Exception('Insert query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        // Get the last inserted ID
        $idQuery = "SELECT SCOPE_IDENTITY() AS SizeID";
        $idStmt = sqlsrv_query($conn, $idQuery);
        $idRow = sqlsrv_fetch_array($idStmt, SQLSRV_FETCH_ASSOC);
        $sizeId = $idRow['SizeID'];
        
        sqlsrv_free_stmt($stmt);
        sqlsrv_free_stmt($idStmt);
        
        return array(
            'success' => true,
            'message' => 'Product size created successfully',
            'sizeId' => (int)$sizeId
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error creating product size: ' . $e->getMessage()
        );
    }
}

/**
 * อัพเดตขนาดผลิตภัณฑ์
 */
function updateProductSize($conn, $sizeId, $data) {
    try {
        $query = "UPDATE ProductSizes 
                  SET SizeValue = ?, 
                      SizeUnit = ?, 
                      SizeDisplay = ?, 
                      sort_order = ?, 
                      IsActive = ?
                  WHERE SizeID = ?";
        
        $params = array(
            $data['sizeValue'],
            $data['sizeUnit'],
            $data['sizeDisplay'],
            isset($data['sortOrder']) ? $data['sortOrder'] : 0,
            $data['isActive'] ? 1 : 0,
            $sizeId
        );
        
        $stmt = sqlsrv_query($conn, $query, $params);
        if ($stmt === false) {
            throw new Exception('Update query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $rows_affected = sqlsrv_rows_affected($stmt);
        sqlsrv_free_stmt($stmt);
        
        if ($rows_affected > 0) {
            return array(
                'success' => true,
                'message' => 'Product size updated successfully'
            );
        } else {
            return array(
                'success' => false,
                'message' => 'Product size not found or no changes made'
            );
        }
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error updating product size: ' . $e->getMessage()
        );
    }
}

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['size_id'])) {
                // ดึงขนาดเฉพาะตัว
                $sizeId = (int)$_GET['size_id'];
                $result = getProductSize($conn, $sizeId);
            } else {
                // ดึงขนาดทั้งหมด (ไม่แยกตาม Product ID เพราะไม่มีใน table structure)
                $result = getProductSizes($conn);
            }
            break;
            
        case 'POST':
            // เพิ่มขนาดใหม่
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input) {
                $result = createProductSize($conn, $input);
            } else {
                $result = array(
                    'success' => false,
                    'message' => 'Invalid JSON input'
                );
            }
            break;
            
        case 'PUT':
            // อัพเดตขนาด
            if (isset($_GET['size_id'])) {
                $sizeId = (int)$_GET['size_id'];
                $input = json_decode(file_get_contents('php://input'), true);
                if ($input) {
                    $result = updateProductSize($conn, $sizeId, $input);
                } else {
                    $result = array(
                        'success' => false,
                        'message' => 'Invalid JSON input'
                    );
                }
            } else {
                $result = array(
                    'success' => false,
                    'message' => 'Size ID required for update'
                );
            }
            break;
            
        default:
            http_response_code(405);
            $result = array(
                'success' => false,
                'message' => 'Method not allowed'
            );
            break;
    }
    
    // Send response
    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
