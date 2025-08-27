-- Complete OrderNumber Integration Script
-- Date: 2025-08-07
-- Description: Add OrderNumber field to both ProductionPlans and ProductionResults tables

USE [ProductionDB]
GO

PRINT '========================================='
PRINT 'Starting OrderNumber Integration Update'
PRINT '========================================='

-- 1. Add OrderNumber column to ProductionPlans table
PRINT 'Step 1: Adding OrderNumber to ProductionPlans table...'
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ProductionPlans]') AND name = 'OrderNumber')
BEGIN
    ALTER TABLE [dbo].[ProductionPlans]
    ADD [OrderNumber] [nvarchar](100) NULL
    
    PRINT '✓ OrderNumber column added successfully to ProductionPlans table'
END
ELSE
BEGIN
    PRINT '⚠ OrderNumber column already exists in ProductionPlans table'
END
GO

-- 2. Add OrderNumber column to ProductionResults table  
PRINT 'Step 2: Adding OrderNumber to ProductionResults table...'
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ProductionResults]') AND name = 'OrderNumber')
BEGIN
    ALTER TABLE [dbo].[ProductionResults]
    ADD [OrderNumber] [nvarchar](100) NULL
    
    PRINT '✓ OrderNumber column added successfully to ProductionResults table'
END
ELSE
BEGIN
    PRINT '⚠ OrderNumber column already exists in ProductionResults table'
END
GO

-- 3. Add index for ProductionPlans.OrderNumber
PRINT 'Step 3: Creating index for ProductionPlans.OrderNumber...'
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[ProductionPlans]') AND name = 'IX_ProductionPlans_OrderNumber')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ProductionPlans_OrderNumber]
    ON [dbo].[ProductionPlans] ([OrderNumber])
    WHERE [OrderNumber] IS NOT NULL
    
    PRINT '✓ Index IX_ProductionPlans_OrderNumber created successfully'
END
ELSE
BEGIN
    PRINT '⚠ Index IX_ProductionPlans_OrderNumber already exists'
END
GO

-- 4. Add index for ProductionResults.OrderNumber
PRINT 'Step 4: Creating index for ProductionResults.OrderNumber...'
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[ProductionResults]') AND name = 'IX_ProductionResults_OrderNumber')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ProductionResults_OrderNumber]
    ON [dbo].[ProductionResults] ([OrderNumber])
    WHERE [OrderNumber] IS NOT NULL
    
    PRINT '✓ Index IX_ProductionResults_OrderNumber created successfully'
END
ELSE
BEGIN
    PRINT '⚠ Index IX_ProductionResults_OrderNumber already exists'
END
GO

-- 5. Display updated schema information
PRINT 'Step 5: Verifying schema updates...'
PRINT ''
PRINT 'ProductionPlans table structure:'
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ProductionPlans' AND COLUMN_NAME = 'OrderNumber'
GO

PRINT 'ProductionResults table structure:'
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ProductionResults' AND COLUMN_NAME = 'OrderNumber'
GO

PRINT ''
PRINT '========================================='
PRINT '✓ OrderNumber Integration Update Complete!'
PRINT '========================================='
PRINT ''
PRINT 'Summary:'
PRINT '- OrderNumber column added to ProductionPlans table'
PRINT '- OrderNumber column added to ProductionResults table' 
PRINT '- Performance indexes created for both tables'
PRINT '- PHP backend updated to handle OrderNumber field'
PRINT '- Ready for Order Number workflow testing'
PRINT ''
