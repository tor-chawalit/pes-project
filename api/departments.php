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
 * ดึงรายการแผนกทั้งหมดที่ยังใช้งานอยู่
 */
function getDepartments($conn, $includeInactive = false) {
    try {
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
        
        $stmt = sqlsrv_query($conn, $query);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $departments = array();
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            // แปลง datetime objects เป็น string
            $departments[] = array(
                'departmentId' => (int)$row['DepartmentID'],
                'departmentName' => $row['DepartmentName'],
                'isActive' => (bool)$row['IsActive'],
                'createdAt' => $row['CreatedAt'] ? $row['CreatedAt']->format('Y-m-d H:i:s') : null,
                'updatedAt' => $row['UpdatedAt'] ? $row['UpdatedAt']->format('Y-m-d H:i:s') : null
            );
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

/**
 * ดึงข้อมูลแผนกเดียว
 */
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
        
        $params = array($departmentId);
        $stmt = sqlsrv_query($conn, $query, $params);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $department = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        if ($department) {
            sqlsrv_free_stmt($stmt);
            return array(
                'success' => true,
                'data' => array(
                    'departmentId' => (int)$department['DepartmentID'],
                    'departmentName' => $department['DepartmentName'],
                    'isActive' => (bool)$department['IsActive'],
                    'createdAt' => $department['CreatedAt'] ? $department['CreatedAt']->format('Y-m-d H:i:s') : null,
                    'updatedAt' => $department['UpdatedAt'] ? $department['UpdatedAt']->format('Y-m-d H:i:s') : null
                )
            );
        } else {
            sqlsrv_free_stmt($stmt);
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

/**
 * ดึงแผนกพร้อมจำนวนเครื่องจักร
 */
function getDepartmentsWithMachineCount($conn) {
    try {
        $query = "SELECT 
            d.DepartmentID,
            d.DepartmentName,
            d.IsActive,
            d.CreatedAt,
            d.UpdatedAt,
            COUNT(m.MachineID) as TotalMachines,
            SUM(CASE WHEN m.IsActive = 1 THEN 1 ELSE 0 END) as ActiveMachines
        FROM Departments d
        LEFT JOIN Machines m ON d.DepartmentID = m.DepartmentID
        WHERE d.IsActive = 1
        GROUP BY d.DepartmentID, d.DepartmentName, d.IsActive, d.CreatedAt, d.UpdatedAt
        ORDER BY d.DepartmentName ASC";
        
        $stmt = sqlsrv_query($conn, $query);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $departments = array();
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $departments[] = array(
                'departmentId' => (int)$row['DepartmentID'],
                'departmentName' => $row['DepartmentName'],
                'isActive' => (bool)$row['IsActive'],
                'totalMachines' => (int)$row['TotalMachines'],
                'activeMachines' => (int)$row['ActiveMachines'],
                'createdAt' => $row['CreatedAt'] ? $row['CreatedAt']->format('Y-m-d H:i:s') : null,
                'updatedAt' => $row['UpdatedAt'] ? $row['UpdatedAt']->format('Y-m-d H:i:s') : null
            );
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
            'message' => 'Error fetching departments with machine count: ' . $e->getMessage()
        );
    }
}

/**
 * เพิ่มแผนกใหม่ (สำหรับ Admin)
 */
function createDepartment($conn, $data) {
    try {
        // ตรวจสอบว่าชื่อแผนกซ้ำหรือไม่
        $checkQuery = "SELECT DepartmentID FROM Departments WHERE DepartmentName = ?";
        $checkParams = array($data['departmentName']);
        $checkStmt = sqlsrv_query($conn, $checkQuery, $checkParams);
        
        if ($checkStmt === false) {
            throw new Exception('Check query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        if (sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC)) {
            sqlsrv_free_stmt($checkStmt);
            return array(
                'success' => false,
                'message' => 'Department name already exists'
            );
        }
        sqlsrv_free_stmt($checkStmt);
        
        $query = "INSERT INTO Departments (DepartmentName, IsActive, CreatedAt, UpdatedAt) 
                  VALUES (?, ?, GETDATE(), GETDATE())";
        
        $params = array(
            $data['departmentName'],
            $data['isActive'] ? 1 : 0
        );
        
        $stmt = sqlsrv_query($conn, $query, $params);
        if ($stmt === false) {
            throw new Exception('Insert query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        // Get the last inserted ID
        $idQuery = "SELECT SCOPE_IDENTITY() AS DepartmentID";
        $idStmt = sqlsrv_query($conn, $idQuery);
        $idRow = sqlsrv_fetch_array($idStmt, SQLSRV_FETCH_ASSOC);
        $departmentId = $idRow['DepartmentID'];
        
        sqlsrv_free_stmt($stmt);
        sqlsrv_free_stmt($idStmt);
        
        return array(
            'success' => true,
            'message' => 'Department created successfully',
            'departmentId' => (int)$departmentId
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error creating department: ' . $e->getMessage()
        );
    }
}

/**
 * อัพเดตแผนก (สำหรับ Admin)
 */
function updateDepartment($conn, $departmentId, $data) {
    try {
        $query = "UPDATE Departments 
                  SET DepartmentName = ?, 
                      IsActive = ?, 
                      UpdatedAt = GETDATE()
                  WHERE DepartmentID = ?";
        
        $params = array(
            $data['departmentName'],
            $data['isActive'] ? 1 : 0,
            $departmentId
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
                'message' => 'Department updated successfully'
            );
        } else {
            return array(
                'success' => false,
                'message' => 'Department not found or no changes made'
            );
        }
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error updating department: ' . $e->getMessage()
        );
    }
}

// Main API logic
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $result = array();
    
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                // ดึงแผนกเดียว
                $departmentId = intval($_GET['id']);
                $result = getDepartment($conn, $departmentId);
            } else if (isset($_GET['with_machines']) && $_GET['with_machines'] == '1') {
                // ดึงแผนกพร้อมจำนวนเครื่องจักร
                $result = getDepartmentsWithMachineCount($conn);
            } else {
                // ดึงแผนกทั้งหมด
                $includeInactive = isset($_GET['include_inactive']) ? 
                    filter_var($_GET['include_inactive'], FILTER_VALIDATE_BOOLEAN) : false;
                $result = getDepartments($conn, $includeInactive);
            }
            break;
            
        case 'POST':
            // เพิ่มแผนกใหม่
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input) {
                $result = createDepartment($conn, $input);
            } else {
                $result = array(
                    'success' => false,
                    'message' => 'Invalid JSON input'
                );
            }
            break;
            
        case 'PUT':
            // อัพเดตแผนก
            if (isset($_GET['id'])) {
                $departmentId = intval($_GET['id']);
                $input = json_decode(file_get_contents('php://input'), true);
                if ($input) {
                    $result = updateDepartment($conn, $departmentId, $input);
                } else {
                    $result = array(
                        'success' => false,
                        'message' => 'Invalid JSON input'
                    );
                }
            } else {
                $result = array(
                    'success' => false,
                    'message' => 'Department ID required for update'
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
