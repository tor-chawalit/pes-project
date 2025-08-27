-- Create Partial Production Confirmations Table
USE [PES]
GO

-- สร้างตาราง PartialProductionConfirmations สำหรับเก็บการบันทึกแบบทีละส่วน
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PartialProductionConfirmations')
BEGIN
    CREATE TABLE [dbo].[PartialProductionConfirmations](
        [PartialID] [int] IDENTITY(1,1) NOT NULL,
        [PlanID] [int] NOT NULL,
        
        -- ข้อมูลการบันทึกครั้งนี้
        [SessionNumber] [int] NOT NULL DEFAULT 1, -- ครั้งที่ของการบันทึก
        [SessionQuantity] [int] NOT NULL, -- จำนวนที่บันทึกครั้งนี้
        [SessionRejectQuantity] [int] NOT NULL DEFAULT 0, -- จำนวนของเสียครั้งนี้
        [SessionGoodQuantity] [int] NOT NULL, -- จำนวนดีครั้งนี้
        
        -- ข้อมูลเวลาการทำงานครั้งนี้
        [ActualStartTime] [datetime2](7) NOT NULL,
        [ActualEndTime] [datetime2](7) NOT NULL,
        [WorkingMinutes] [int] NOT NULL, -- เวลาทำงานสุทธิ (นาที)
        
        -- ข้อมูล Break time ครั้งนี้
        [BreakMorningMinutes] [int] NOT NULL DEFAULT 0,
        [BreakLunchMinutes] [int] NOT NULL DEFAULT 0,
        [BreakEveningMinutes] [int] NOT NULL DEFAULT 0,
        [TotalBreakMinutes] [int] NOT NULL DEFAULT 0,
        
        -- ข้อมูล Setup และ Downtime ครั้งนี้
        [SetupMinutes] [int] NOT NULL DEFAULT 0,
        [DowntimeMinutes] [int] NOT NULL DEFAULT 0,
        [DowntimeReason] [nvarchar](500) NULL,
        
        -- OEE สำหรับครั้งนี้ (ไม่จำเป็นต้องคำนวณ เพราะยังไม่เสร็จ)
        [SessionRunRate] [decimal](10,2) NULL,
        [SessionEfficiency] [decimal](5,2) NULL,
        
        -- ข้อมูลสะสม
        [CumulativeQuantity] [int] NOT NULL, -- จำนวนสะสมรวม
        [RemainingQuantity] [int] NOT NULL, -- จำนวนคงเหลือหลังครั้งนี้
        
        -- ข้อมูลการบันทึก
        [ConfirmedByUserID] [int] NOT NULL DEFAULT 1,
        [ConfirmedByUserName] [nvarchar](100) NOT NULL DEFAULT 'System',
        [ConfirmedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
        
        -- สถานะ
        [Status] [nvarchar](20) NOT NULL DEFAULT 'partial', -- 'partial' หรือ 'completed'
        [Notes] [nvarchar](1000) NULL,
        
    PRIMARY KEY CLUSTERED ([PartialID] ASC),
    
    -- Foreign Key
    CONSTRAINT [FK_PartialConfirmations_ProductionPlans] 
        FOREIGN KEY([PlanID]) REFERENCES [dbo].[ProductionPlans] ([PlanID])
        ON DELETE CASCADE
    )
END
GO

-- Add indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PartialConfirmations_PlanID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PartialConfirmations_PlanID] 
    ON [dbo].[PartialProductionConfirmations] ([PlanID])
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PartialConfirmations_ConfirmedAt')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_PartialConfirmations_ConfirmedAt] 
    ON [dbo].[PartialProductionConfirmations] ([ConfirmedAt])
END
GO

-- Add constraints
ALTER TABLE [dbo].[PartialProductionConfirmations]
ADD CONSTRAINT [CK_PartialConfirmations_SessionQuantity] 
CHECK ([SessionQuantity] > 0)
GO

ALTER TABLE [dbo].[PartialProductionConfirmations]
ADD CONSTRAINT [CK_PartialConfirmations_Times] 
CHECK ([ActualEndTime] > [ActualStartTime])
GO

-- สร้าง View สำหรับดูข้อมูลสรุป
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = 'vw_PartialConfirmationSummary')
BEGIN
    EXEC ('CREATE VIEW [dbo].[vw_PartialConfirmationSummary] AS
    SELECT 
        pc.PlanID,
        pp.ProductName,
        pp.TargetOutput,
        COUNT(pc.PartialID) as TotalSessions,
        SUM(pc.SessionQuantity) as TotalProduced,
        MAX(pc.RemainingQuantity) as RemainingQuantity,
        MIN(pc.ConfirmedAt) as FirstSessionAt,
        MAX(pc.ConfirmedAt) as LastSessionAt,
        CASE 
            WHEN MAX(pc.RemainingQuantity) <= 0 THEN ''completed''
            ELSE ''partial''
        END as OverallStatus
    FROM PartialProductionConfirmations pc
    INNER JOIN ProductionPlans pp ON pc.PlanID = pp.PlanID
    GROUP BY pc.PlanID, pp.ProductName, pp.TargetOutput')
END
GO

PRINT 'Partial Production Confirmations table created successfully!'
