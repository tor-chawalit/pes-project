<?php

// For Localhost
$serverName = "localhost"; // IP address and port of the SQL Server
$connectionOptions = array(
    "Database" => "PES",
    "Uid" => "",
    "PWD" => "",
    "CharacterSet" => "UTF-8",
);
// // For Sever 
//     $serverName = "203.154.130.236"; // IP address and port of the SQL Server
//     $connectionOptions = array(
//      "Database" => "ProductionDB",
//      "Uid" => "sa",
//      "PWD" => "Journal@25",
//      "CharacterSet" => "UTF-8"
// );
$conn = sqlsrv_connect($serverName, $connectionOptions);

if (!$conn) {
    // ดึงข้อมูล error ที่เกิดขึ้น
    $errors = sqlsrv_errors();
    $errorMessage = "Database Connection Failed!\n";
    
    if ($errors != null) {
        foreach ($errors as $error) {
            $errorMessage .= "SQLSTATE: " . $error['SQLSTATE'] . "\n";
            $errorMessage .= "Code: " . $error['code'] . "\n";
            $errorMessage .= "Message: " . $error['message'] . "\n";
            $errorMessage .= "------------------------\n";
        }
    }
    
    // แสดง error
    echo "<div style='background:#ffebee; color:#c62828; padding:15px; border:2px solid #e57373; margin:20px; border-radius:8px; font-family:monospace;'>";
    echo "<h3 style='color:#d32f2f; margin-top:0;'>🚫 ข้อผิดพลาดการเชื่อมต่อฐานข้อมูล</h3>";
    echo "<pre style='margin:0; font-size:14px; line-height:1.4;'>";
    echo htmlspecialchars($errorMessage);
    echo "</pre>";
    echo "<small style='color:#666; display:block; margin-top:10px; font-style:italic;'>วันที่: " . date('Y-m-d H:i:s') . "</small>";
    echo "</div>";
    
    $conn = false;
}
?>
