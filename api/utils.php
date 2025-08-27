
<?php
// ===== ฟังก์ชันช่วยเหลือ =====

function validateStatus($status) {
    $validStatuses = [
        'planning',
        'in-progress', 
        'completed',
        'cancelled'
    ];
    
    return in_array($status, $validStatuses);
}

function formatDateTime($dateTime) {
    if (isset($dateTime) && $dateTime && is_object($dateTime)) {
        return $dateTime->format('Y-m-d H:i:s');
    }
    return $dateTime;
}

function formatDate($date) {
    if (isset($date) && $date && is_object($date)) {
        return $date->format('Y-m-d');
    }
    return $date;
}

function safeMachineNameFromIDs($conn, $machineIDs, $fallback = 'ไม่ระบุ') {
    if (empty($machineIDs)) {
        return $fallback;
    }
    
    $machineIds = explode(',', $machineIDs);
    $machineNames = [];
    
    foreach ($machineIds as $machineId) {
        $machineId = trim($machineId);
        if (!empty($machineId)) {
            $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
            $machineStmt = sqlsrv_query($conn, $machineSql, [$machineId]);
            if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                $originalName = $machineRow['MachineName'] ?? '';
                $cleanName = mb_substr(trim($originalName) ?: $fallback, 0, 200, 'UTF-8');
                $machineNames[] = $cleanName;
            }
        }
    }
    
    return !empty($machineNames) ? implode(', ', $machineNames) : $fallback;
}

function buildWhereConditions($filters) {
    $whereConditions = ['1=1'];
    $params = [];
    
    if (isset($filters['startDate']) && !empty($filters['startDate'])) {
        $whereConditions[] = "CONVERT(date, COALESCE(p.UpdatedAt, p.CreatedAt)) >= ?";
        $params[] = $filters['startDate'];
    }
    if (isset($filters['endDate']) && !empty($filters['endDate'])) {
        $whereConditions[] = "CONVERT(date, COALESCE(p.UpdatedAt, p.CreatedAt)) <= ?";
        $params[] = $filters['endDate'];
    }
    if (isset($filters['departmentId']) && !empty($filters['departmentId'])) {
        $whereConditions[] = "p.DepartmentID = ?";
        $params[] = intval($filters['departmentId']);
    }
    if (isset($filters['machineId']) && !empty($filters['machineId'])) {
        $machineId = intval($filters['machineId']);
        $whereConditions[] = "(p.MachineID = ? OR p.MachineIDs LIKE '%' + CAST(? AS VARCHAR) + '%')";
        $params[] = $machineId;
        $params[] = $machineId;
    }
    
    return [
        'whereClause' => implode(' AND ', $whereConditions),
        'params' => $params
    ];
}
?>