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
 * ดึงรายการเครื่องจักรตามแผนก
 */
function getMachinesByDepartment($conn, $departmentId) {
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
        INNER JOIN Departments d ON m.DepartmentID = d.DepartmentID
        WHERE m.DepartmentID = ? AND m.IsActive = 1 AND d.IsActive = 1
        ORDER BY m.MachineName ASC";
        
        $params = array($departmentId);
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
                'DefaultIdealRunRate' => (float)$row['DefaultIdealRunRate'],
                'IsActive' => (bool)$row['IsActive'],
                'CreatedAt' => $row['CreatedAt'] ? $row['CreatedAt']->format('Y-m-d H:i:s') : null,
                'UpdatedAt' => $row['UpdatedAt'] ? $row['UpdatedAt']->format('Y-m-d H:i:s') : null
            );
        }
        
        sqlsrv_free_stmt($stmt);
        
        return array(
            'success' => true,
            'data' => $machines,
            'count' => count($machines),
            'departmentId' => $departmentId
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching machines: ' . $e->getMessage()
        );
    }
}

/**
 * ดึงข้อมูลเครื่องจักรเดียว
 */
function getMachine($conn, $machineId) {
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
        INNER JOIN Departments d ON m.DepartmentID = d.DepartmentID
        WHERE m.MachineID = ? AND m.IsActive = 1";
        
        $params = array($machineId);
        $stmt = sqlsrv_query($conn, $query, $params);
        
        if ($stmt === false) {
            throw new Exception('Query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        $machine = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        if ($machine) {
            sqlsrv_free_stmt($stmt);
            return array(
                'success' => true,
                'data' => array(
                    'MachineID' => (int)$machine['MachineID'],
                    'MachineName' => $machine['MachineName'],
                    'DepartmentID' => (int)$machine['DepartmentID'],
                    'DepartmentName' => $machine['DepartmentName'],
                    'DefaultIdealRunRate' => (float)$machine['DefaultIdealRunRate'],
                    'IsActive' => (bool)$machine['IsActive'],
                    'CreatedAt' => $machine['CreatedAt'] ? $machine['CreatedAt']->format('Y-m-d H:i:s') : null,
                    'UpdatedAt' => $machine['UpdatedAt'] ? $machine['UpdatedAt']->format('Y-m-d H:i:s') : null
                )
            );
        } else {
            sqlsrv_free_stmt($stmt);
            return array(
                'success' => false,
                'message' => 'Machine not found'
            );
        }
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching machine: ' . $e->getMessage()
        );
    }
}

/**
 * ดึงเครื่องจักรทั้งหมด (สำหรับ Admin)
 */
function getAllMachines($conn, $includeInactive = false) {
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
        INNER JOIN Departments d ON m.DepartmentID = d.DepartmentID";
        
        if (!$includeInactive) {
            $query .= " WHERE m.IsActive = 1 AND d.IsActive = 1";
        }
        
        $query .= " ORDER BY d.DepartmentName, m.MachineName";
        
        $stmt = sqlsrv_query($conn, $query);
        
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
                'DefaultIdealRunRate' => (float)$row['DefaultIdealRunRate'],
                'IsActive' => (bool)$row['IsActive'],
                'CreatedAt' => $row['CreatedAt'] ? $row['CreatedAt']->format('Y-m-d H:i:s') : null,
                'UpdatedAt' => $row['UpdatedAt'] ? $row['UpdatedAt']->format('Y-m-d H:i:s') : null
            );
        }
        
        sqlsrv_free_stmt($stmt);
        
        return array(
            'success' => true,
            'data' => $machines,
            'count' => count($machines)
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error fetching all machines: ' . $e->getMessage()
        );
    }
}

/**
 * เพิ่มเครื่องจักรใหม่ (สำหรับ Admin)
 */
function createMachine($conn, $data) {
    try {
        // ตรวจสอบว่าแผนกมีอยู่จริง
        $checkQuery = "SELECT DepartmentID FROM Departments WHERE DepartmentID = ? AND IsActive = 1";
        $checkParams = array($data['departmentId']);
        $checkStmt = sqlsrv_query($conn, $checkQuery, $checkParams);
        
        if ($checkStmt === false) {
            throw new Exception('Check query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        if (!sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC)) {
            sqlsrv_free_stmt($checkStmt);
            return array(
                'success' => false,
                'message' => 'Department not found or inactive'
            );
        }
        sqlsrv_free_stmt($checkStmt);
        
        $query = "INSERT INTO Machines (MachineName, DepartmentID, DefaultIdealRunRate, IsActive, CreatedAt, UpdatedAt) 
                  VALUES (?, ?, ?, ?, GETDATE(), GETDATE())";
        
        $params = array(
            $data['machineName'],
            $data['departmentId'],
            $data['defaultIdealRunRate'] ?? 0,
            $data['isActive'] ? 1 : 0
        );
        
        $stmt = sqlsrv_query($conn, $query, $params);
        if ($stmt === false) {
            throw new Exception('Insert query failed: ' . print_r(sqlsrv_errors(), true));
        }
        
        // Get the last inserted ID
        $idQuery = "SELECT SCOPE_IDENTITY() AS MachineID";
        $idStmt = sqlsrv_query($conn, $idQuery);
        $idRow = sqlsrv_fetch_array($idStmt, SQLSRV_FETCH_ASSOC);
        $machineId = $idRow['MachineID'];
        
        sqlsrv_free_stmt($stmt);
        sqlsrv_free_stmt($idStmt);
        
        return array(
            'success' => true,
            'message' => 'Machine created successfully',
            'machineId' => (int)$machineId
        );
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error creating machine: ' . $e->getMessage()
        );
    }
}

/**
 * อัพเดตเครื่องจักร (สำหรับ Admin)
 */
function updateMachine($conn, $machineId, $data) {
    try {
        $query = "UPDATE Machines 
                  SET MachineName = ?, 
                      DepartmentID = ?, 
                      DefaultIdealRunRate = ?, 
                      IsActive = ?, 
                      UpdatedAt = GETDATE()
                  WHERE MachineID = ?";
        
        $params = array(
            $data['machineName'],
            $data['departmentId'],
            $data['defaultIdealRunRate'] ?? 0,
            $data['isActive'] ? 1 : 0,
            $machineId
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
                'message' => 'Machine updated successfully'
            );
        } else {
            return array(
                'success' => false,
                'message' => 'Machine not found or no changes made'
            );
        }
        
    } catch (Exception $e) {
        return array(
            'success' => false,
            'message' => 'Error updating machine: ' . $e->getMessage()
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
                // ดึงเครื่องจักรเดียว
                $machineId = intval($_GET['id']);
                $result = getMachine($conn, $machineId);
            } else if (isset($_GET['department'])) {
                // ดึงเครื่องจักรตามแผนก
                $departmentId = intval($_GET['department']);
                $result = getMachinesByDepartment($conn, $departmentId);
            } else {
                // ดึงเครื่องจักรทั้งหมด
                $includeInactive = isset($_GET['include_inactive']) ? 
                    filter_var($_GET['include_inactive'], FILTER_VALIDATE_BOOLEAN) : false;
                $result = getAllMachines($conn, $includeInactive);
            }
            break;
            
        case 'POST':
            // เพิ่มเครื่องจักรใหม่
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input) {
                $result = createMachine($conn, $input);
            } else {
                $result = array(
                    'success' => false,
                    'message' => 'Invalid JSON input'
                );
            }
            break;
            
        case 'PUT':
            // อัพเดตเครื่องจักร
            if (isset($_GET['id'])) {
                $machineId = intval($_GET['id']);
                $input = json_decode(file_get_contents('php://input'), true);
                if ($input) {
                    $result = updateMachine($conn, $machineId, $input);
                } else {
                    $result = array(
                        'success' => false,
                        'message' => 'Invalid JSON input'
                    );
                }
            } else {
                $result = array(
                    'success' => false,
                    'message' => 'Machine ID required for update'
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