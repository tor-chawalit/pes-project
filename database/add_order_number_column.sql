-- Add OrderNumber column to ProductionPlans table
-- Date: 2025-08-07
-- Description: Add OrderNumber field to support order tracking when starting work

USE [ProductionDB]
GO

-- เพิ่ม OrderNumber column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ProductionPlans]') AND name = 'OrderNumber')
BEGIN
    ALTER TABLE [dbo].[ProductionPlans]
    ADD [OrderNumber] [nvarchar](100) NULL
    
    PRINT 'OrderNumber column added successfully to ProductionPlans table'
END
ELSE
BEGIN
    PRINT 'OrderNumber column already exists in ProductionPlans table'
END
GO

-- เพิ่ม index สำหรับ OrderNumber เพื่อให้ค้นหาได้เร็วขึ้น
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[ProductionPlans]') AND name = 'IX_ProductionPlans_OrderNumber')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ProductionPlans_OrderNumber]
    ON [dbo].[ProductionPlans] ([OrderNumber])
    WHERE [OrderNumber] IS NOT NULL
    
    PRINT 'Index IX_ProductionPlans_OrderNumber created successfully'
END
ELSE
BEGIN
    PRINT 'Index IX_ProductionPlans_OrderNumber already exists'
END
GO

-- แสดงข้อมูลของ table หลังการอัปเดต
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ProductionPlans'
ORDER BY ORDINAL_POSITION
GO

PRINT 'Database schema update completed!'
