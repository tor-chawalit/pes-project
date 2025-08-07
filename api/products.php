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
 * ดึงรายการผลิตภัณฑ์ทั้งหมดที่ยังใช้งานอยู่
 */
function getProducts($conn) {
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
        WHERE IsActive = 1 
        ORDER BY ProductName ASC";
        
        $stmt = sqlsrv_query($conn, $query);
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
                'CreatedAt' => $row['CreatedAt'] ? $row['CreatedAt']->format('Y-m-d H:i:s') : null,
                'UpdatedAt' => $row['UpdatedAt'] ? $row['UpdatedAt']->format('Y-m-d H:i:s') : null
            );
        }
        
        sqlsrv_free_stmt($stmt);
        
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

/**
 * ดึงข้อมูลผลิตภัณฑ์เฉพาะตัว
 */
function getProduct($conn, $productId) {
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
        WHERE ProductID = ? AND IsActive = 1";
        
        $params = array($productId);
        $stmt = sqlsrv_query($conn, $query, $params);
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $product = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        if ($product) {
            sqlsrv_free_stmt($stmt);
            return array(
                'success' => true,
                'data' => array(
                    'productId' => (int)$product['ProductID'],
                    'productCode' => $product['ProductCode'],
                    'productName' => $product['ProductName'],
                    'description' => $product['Description'],
                    'isActive' => (bool)$product['IsActive'],
                    'createdAt' => $product['CreatedAt'] ? $product['CreatedAt']->format('Y-m-d H:i:s') : null,
                    'updatedAt' => $product['UpdatedAt'] ? $product['UpdatedAt']->format('Y-m-d H:i:s') : null
                )
            );
        } else {
            sqlsrv_free_stmt($stmt);
            return array(
                'success' => false,
                'message' => 'Product not found'
            );
        }
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching product: ' . $e->getMessage()
        );
    }
}

/**
 * เพิ่มผลิตภัณฑ์ใหม่ (สำหรับ Admin)
 */
function createProduct($conn, $data) {
    try {
        $query = "INSERT INTO Products (ProductCode, ProductName, Description, IsActive, CreatedAt, UpdatedAt) 
                  VALUES (?, ?, ?, ?, GETDATE(), GETDATE())";
        
        $params = array(
            $data['productCode'],
            $data['productName'],
            $data['description'],
            $data['isActive'] ? 1 : 0
        );
        
        $stmt = sqlsrv_query($conn, $query, $params);
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        // Get the last inserted ID
        $idQuery = "SELECT SCOPE_IDENTITY() AS ProductID";
        $idStmt = sqlsrv_query($conn, $idQuery);
        $idRow = sqlsrv_fetch_array($idStmt, SQLSRV_FETCH_ASSOC);
        $productId = $idRow['ProductID'];
        
        sqlsrv_free_stmt($stmt);
        sqlsrv_free_stmt($idStmt);
        
        return array(
            'success' => true,
            'message' => 'Product created successfully',
            'productId' => (int)$productId
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error creating product: ' . $e->getMessage()
        );
    }
}

/**
 * อัพเดตผลิตภัณฑ์ (สำหรับ Admin)
 */
function updateProduct($conn, $productId, $data) {
    try {
        $query = "UPDATE Products 
                  SET ProductCode = ?, 
                      ProductName = ?, 
                      Description = ?, 
                      IsActive = ?, 
                      UpdatedAt = GETDATE()
                  WHERE ProductID = ?";
        
        $params = array(
            $data['productCode'],
            $data['productName'],
            $data['description'],
            $data['isActive'] ? 1 : 0,
            $productId
        );
        
        $stmt = sqlsrv_query($conn, $query, $params);
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $rows_affected = sqlsrv_rows_affected($stmt);
        sqlsrv_free_stmt($stmt);
        
        if ($rows_affected > 0) {
            return array(
                'success' => true,
                'message' => 'Product updated successfully'
            );
        } else {
            return array(
                'success' => false,
                'message' => 'Product not found or no changes made'
            );
        }
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error updating product: ' . $e->getMessage()
        );
    }
}

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['product_id'])) {
                // ดึงผลิตภัณฑ์เฉพาะตัว
                $productId = (int)$_GET['product_id'];
                $result = getProduct($conn, $productId);
            } else {
                // ดึงผลิตภัณฑ์ทั้งหมด
                $result = getProducts($conn);
            }
            break;
            
        case 'POST':
            // เพิ่มผลิตภัณฑ์ใหม่
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input) {
                $result = createProduct($conn, $input);
            } else {
                $result = array(
                    'success' => false,
                    'message' => 'Invalid JSON input'
                );
            }
            break;
            
        case 'PUT':
            // อัพเดตผลิตภัณฑ์
            if (isset($_GET['product_id'])) {
                $productId = (int)$_GET['product_id'];
                $input = json_decode(file_get_contents('php://input'), true);
                if ($input) {
                    $result = updateProduct($conn, $productId, $input);
                } else {
                    $result = array(
                        'success' => false,
                        'message' => 'Invalid JSON input'
                    );
                }
            } else {
                $result = array(
                    'success' => false,
                    'message' => 'Product ID required for update'
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
