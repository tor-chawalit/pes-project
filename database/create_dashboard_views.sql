-- ==========================================
-- Dashboard Views Creation Script
-- ==========================================
-- สคริปต์สำหรับสร้าง Views ที่ใช้ใน Dashboard
-- วันที่สร้าง: 11 สิงหาคม 2025
-- ==========================================

USE [ProductionSystem];
GO

-- ==========================================
-- 1. View สำหรับ OEE Statistics
-- ==========================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_OEE_Summary')
    DROP VIEW vw_OEE_Summary;
GO

CREATE VIEW vw_OEE_Summary AS
SELECT 
    d.DepartmentID,
    d.DepartmentName,
    COUNT(*) as TotalRecords,
    AVG(CAST(pr.OEE_Availability as FLOAT)) as AvgAvailability,
    AVG(CAST(pr.OEE_Performance as FLOAT)) as AvgPerformance,
    AVG(CAST(pr.OEE_Quality as FLOAT)) as AvgQuality,
    AVG(CAST(pr.OEE_Overall as FLOAT)) as AvgOverallOEE,
    CAST(pr.ProductionDate as DATE) as ProductionDate
FROM ProductionResults pr
INNER JOIN ProductionPlans pp ON pr.PlanID = pp.PlanID
INNER JOIN Departments d ON pp.DepartmentID = d.DepartmentID
WHERE pr.OEE_Overall > 0
GROUP BY d.DepartmentID, d.DepartmentName, CAST(pr.ProductionDate as DATE);
GO

-- ==========================================
-- 2. View สำหรับ Production Summary
-- ==========================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_Production_Summary')
    DROP VIEW vw_Production_Summary;
GO

CREATE VIEW vw_Production_Summary AS
SELECT 
    d.DepartmentID,
    d.DepartmentName,
    CAST(pr.ProductionDate as DATE) as ProductionDate,
    SUM(pr.TotalPieces) as TotalProduction,
    SUM(pr.GoodQuantity) as TotalGoodPieces,
    SUM(pr.RejectPieces) as TotalRejectPieces,
    COUNT(DISTINCT pr.PlanID) as CompletedPlans,
    AVG(CAST(pr.OEE_Overall as FLOAT)) as DailyOEE
FROM ProductionResults pr
INNER JOIN ProductionPlans pp ON pr.PlanID = pp.PlanID
INNER JOIN Departments d ON pp.DepartmentID = d.DepartmentID
GROUP BY d.DepartmentID, d.DepartmentName, CAST(pr.ProductionDate as DATE);
GO

-- ==========================================
-- 3. View สำหรับ Production Progress
-- ==========================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_Production_Progress')
    DROP VIEW vw_Production_Progress;
GO

CREATE VIEW vw_Production_Progress AS
SELECT 
    d.DepartmentID,
    d.DepartmentName,
    COUNT(CASE WHEN pp.Status = 'completed' THEN 1 END) as CompletedPlans,
    COUNT(CASE WHEN pp.Status = 'in-progress' THEN 1 END) as InProgressPlans,
    COUNT(CASE WHEN pp.Status = 'pending' THEN 1 END) as PendingPlans,
    COUNT(*) as TotalPlans,
    CAST(COUNT(CASE WHEN pp.Status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as DECIMAL(5,2)) as CompletionRate
FROM ProductionPlans pp
INNER JOIN Departments d ON pp.DepartmentID = d.DepartmentID
WHERE pp.CreatedAt >= DATEADD(day, -30, GETDATE()) -- Last 30 days
GROUP BY d.DepartmentID, d.DepartmentName;
GO

-- ==========================================
-- 4. View สำหรับ Daily OEE Trends
-- ==========================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_Daily_OEE_Trends')
    DROP VIEW vw_Daily_OEE_Trends;
GO

CREATE VIEW vw_Daily_OEE_Trends AS
SELECT 
    CAST(pr.ProductionDate as DATE) as ProductionDate,
    d.DepartmentID,
    d.DepartmentName,
    AVG(CAST(pr.OEE_Availability as FLOAT)) as DailyAvailability,
    AVG(CAST(pr.OEE_Performance as FLOAT)) as DailyPerformance,
    AVG(CAST(pr.OEE_Quality as FLOAT)) as DailyQuality,
    AVG(CAST(pr.OEE_Overall as FLOAT)) as DailyOEE,
    COUNT(*) as RecordsCount
FROM ProductionResults pr
INNER JOIN ProductionPlans pp ON pr.PlanID = pp.PlanID
INNER JOIN Departments d ON pp.DepartmentID = d.DepartmentID
WHERE pr.OEE_Overall > 0
    AND pr.ProductionDate >= DATEADD(day, -30, GETDATE()) -- Last 30 days
GROUP BY CAST(pr.ProductionDate as DATE), d.DepartmentID, d.DepartmentName;
GO

-- ==========================================
-- 5. View สำหรับ Dashboard Alerts
-- ==========================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_Dashboard_Alerts')
    DROP VIEW vw_Dashboard_Alerts;
GO

CREATE VIEW vw_Dashboard_Alerts AS
SELECT 
    'unconfirmed_tasks' as AlertType,
    'รอการยืนยัน' as AlertTitle,
    COUNT(*) as AlertCount,
    'warning' as AlertLevel
FROM ProductionResults pr
WHERE pr.ConfirmedAt IS NULL
    AND pr.CreatedAt >= DATEADD(day, -7, GETDATE())

UNION ALL

SELECT 
    'overdue_plans' as AlertType,
    'เกินกำหนด' as AlertTitle,
    COUNT(*) as AlertCount,
    'danger' as AlertLevel
FROM ProductionPlans pp
WHERE pp.Status != 'completed'
    AND pp.PlannedEndTime < GETDATE()

UNION ALL

SELECT 
    'low_oee' as AlertType,
    'OEE ต่ำ' as AlertTitle,
    COUNT(*) as AlertCount,
    'info' as AlertLevel
FROM ProductionResults pr
WHERE CAST(pr.OEE_Overall as FLOAT) < 70
    AND pr.ProductionDate >= DATEADD(day, -7, GETDATE());
GO

-- ==========================================
-- สร้าง Index สำหรับ Performance
-- ==========================================

-- Index สำหรับ ProductionResults table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductionResults_Date_OEE')
BEGIN
    CREATE INDEX IX_ProductionResults_Date_OEE 
    ON ProductionResults(ProductionDate, OEE_Overall)
    INCLUDE (OEE_Availability, OEE_Performance, OEE_Quality);
END
GO

-- Index สำหรับ ProductionPlans table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductionPlans_Status_Date')
BEGIN
    CREATE INDEX IX_ProductionPlans_Status_Date 
    ON ProductionPlans(Status, CreatedAt, PlannedEndTime)
    INCLUDE (DepartmentID);
END
GO

-- ==========================================
-- Test Queries
-- ==========================================

PRINT '==========================================';
PRINT 'Testing Views...';
PRINT '==========================================';

-- Test OEE Summary
PRINT 'Testing vw_OEE_Summary...';
SELECT TOP 5 * FROM vw_OEE_Summary ORDER BY ProductionDate DESC;

-- Test Production Summary  
PRINT 'Testing vw_Production_Summary...';
SELECT TOP 5 * FROM vw_Production_Summary ORDER BY ProductionDate DESC;

-- Test Production Progress
PRINT 'Testing vw_Production_Progress...';
SELECT * FROM vw_Production_Progress;

-- Test Daily OEE Trends
PRINT 'Testing vw_Daily_OEE_Trends...';
SELECT TOP 10 * FROM vw_Daily_OEE_Trends ORDER BY ProductionDate DESC;

-- Test Dashboard Alerts
PRINT 'Testing vw_Dashboard_Alerts...';
SELECT * FROM vw_Dashboard_Alerts WHERE AlertCount > 0;

PRINT '==========================================';
PRINT 'Views Created Successfully!';
PRINT '==========================================';
