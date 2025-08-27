-- สร้างตารางสำหรับเก็บข้อมูล Partial Production Confirmations
-- Table: PartialProductionConfirmations
USE [PES]
GO

-- ตรวจสอบและลบตารางเดิมถ้ามี
IF OBJECT_ID(N'[dbo].[PartialProductionConfirmations]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[PartialProductionConfirmations];
    PRINT 'ตารางเดิม PartialProductionConfirmations ถูกลบแล้ว';
END

-- สร้างตารางใหม่
CREATE TABLE [dbo].[PartialProductionConfirmations](
    [PartialConfirmID] [int] IDENTITY(1,1) NOT NULL,
    [PlanID] [int] NOT NULL,
    [ConfirmDate] [date] NOT NULL,
    [ConfirmedQuantity] [int] NOT NULL,
    [RejectQuantity] [int] NULL DEFAULT(0),
    [GoodQuantity] AS ([ConfirmedQuantity] - [RejectQuantity]),
    [ConfirmedAt] [datetime2](7) NOT NULL DEFAULT(GETDATE()),
    [ConfirmedByUserName] [nvarchar](100) NULL,
    [Notes] [nvarchar](500) NULL,
    [Status] [nvarchar](50) NOT NULL DEFAULT('CONFIRMED'),
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT(GETDATE()),
    [UpdatedAt] [datetime2](7) NULL,
    
    CONSTRAINT [PK_PartialProductionConfirmations] PRIMARY KEY CLUSTERED 
    (
        [PartialConfirmID] ASC
    ) ON [PRIMARY],
    
    CONSTRAINT [FK_PartialProductionConfirmations_PlanID] FOREIGN KEY([PlanID])
        REFERENCES [dbo].[ProductionPlans] ([PlanID])
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ON [PRIMARY]
GO

-- สร้าง Index สำหรับการค้นหา
CREATE INDEX [IX_PartialConfirmations_PlanID] ON [dbo].[PartialProductionConfirmations] ([PlanID]);
CREATE INDEX [IX_PartialConfirmations_Date] ON [dbo].[PartialProductionConfirmations] ([ConfirmDate]);
CREATE INDEX [IX_PartialConfirmations_Status] ON [dbo].[PartialProductionConfirmations] ([Status]);

-- เพิ่ม Check Constraints
ALTER TABLE [dbo].[PartialProductionConfirmations] 
    ADD CONSTRAINT [CK_PartialConfirmations_ConfirmedQuantity_Positive] 
    CHECK ([ConfirmedQuantity] >= 0);

ALTER TABLE [dbo].[PartialProductionConfirmations] 
    ADD CONSTRAINT [CK_PartialConfirmations_RejectQuantity_Valid] 
    CHECK ([RejectQuantity] >= 0 AND [RejectQuantity] <= [ConfirmedQuantity]);

ALTER TABLE [dbo].[PartialProductionConfirmations] 
    ADD CONSTRAINT [CK_PartialConfirmations_Status_Valid] 
    CHECK ([Status] IN ('CONFIRMED', 'CANCELLED', 'REVISED'));

-- เพิ่ม Trigger สำหรับ UpdatedAt
GO
CREATE TRIGGER [TR_PartialProductionConfirmations_UpdatedAt]
ON [dbo].[PartialProductionConfirmations]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[PartialProductionConfirmations]
    SET [UpdatedAt] = GETDATE()
    FROM [dbo].[PartialProductionConfirmations] p
    INNER JOIN inserted i ON p.[PartialConfirmID] = i.[PartialConfirmID];
END
GO

PRINT 'ตาราง PartialProductionConfirmations ถูกสร้างเรียบร้อยแล้ว';
GO
