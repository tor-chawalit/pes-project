-- Add OrderNumber column to ProductionResults table
-- Date: 2025-08-07
-- Description: Add OrderNumber field to ProductionResults table for historical tracking

USE [ProductionDB]
GO

-- เพิ่ม OrderNumber column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ProductionResults]') AND name = 'OrderNumber')
BEGIN
    ALTER TABLE [dbo].[ProductionResults]
    ADD [OrderNumber] [nvarchar](100) NULL
    
    PRINT 'OrderNumber column added successfully to ProductionResults table'
END
ELSE
BEGIN
    PRINT 'OrderNumber column already exists in ProductionResults table'
END
GO

-- เพิ่ม index สำหรับ OrderNumber เพื่อให้ค้นหาได้เร็วขึ้น
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[ProductionResults]') AND name = 'IX_ProductionResults_OrderNumber')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ProductionResults_OrderNumber]
    ON [dbo].[ProductionResults] ([OrderNumber])
    WHERE [OrderNumber] IS NOT NULL
    
    PRINT 'Index IX_ProductionResults_OrderNumber created successfully'
END
ELSE
BEGIN
    PRINT 'Index IX_ProductionResults_OrderNumber already exists'
END
GO

-- แสดงข้อมูลของ table หลังการอัปเดต
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ProductionResults'
ORDER BY ORDINAL_POSITION
GO

PRINT 'ProductionResults schema update completed!'
